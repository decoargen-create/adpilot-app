import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import client from '../api/client';

const PublishContext = createContext();

// Generate success chime using Web Audio API
function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch (e) { /* Audio not available */ }
}

// Generate error sound
function playErrorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 200;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => ctx.close(), 1000);
  } catch (e) { /* Audio not available */ }
}

const PUBLISH_STEPS = [
  { label: 'Creando registro local' },
  { label: 'Subiendo archivos al servidor' },
  { label: 'Guardando en biblioteca' },
  { label: 'Leyendo config de campaña base' },
  { label: 'Creando campaña y subiendo a Meta' },
  { label: 'Activando campaña' },
];

export function PublishProvider({ children }) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState(-1);
  const [publishError, setPublishError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [showWidget, setShowWidget] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');
  const abortRef = useRef(false);

  const dismissWidget = useCallback(() => {
    setShowWidget(false);
    setPublishStep(-1);
    setPublishError('');
    setPublishSuccess('');
    setCampaignName('');
    setWhatsappLink('');
  }, []);

  const publishSingleDay = useCallback(async ({ preset, files, dayDate, budget, settings, campaignNameStr, productLink }) => {
    const tipo = files.some(f => f.type?.startsWith('video/')) ? 'videos' : 'estaticos';

    // Step 0: Create local record
    setPublishStep(0);
    const campaignRes = await client.post('/campaigns', {
      product: preset.name,
      date: dayDate,
      type: tipo,
      budget: parseFloat(budget)
    });

    // Step 1: Upload files
    setPublishStep(1);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const uploadRes = await client.post(`/uploads/${campaignRes.data.id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // Step 2: Save to library
    setPublishStep(2);
    const libFormData = new FormData();
    files.forEach(file => libFormData.append('files', file));
    libFormData.append('product_preset_id', preset.id);
    libFormData.append('product_name', preset.name);
    libFormData.append('batch_date', dayDate);
    await client.post('/library/upload', libFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).catch(() => {});

    // Step 3: Validate base campaign
    setPublishStep(3);
    try {
      const validateRes = await client.get(
        `/meta/campaigns/${preset.base_campaign_id}/adsets?ad_account_id=${preset.ad_account_id}`
      );
      const baseAdsets = validateRes.data || [];
      if (baseAdsets.length === 0) {
        throw new Error(
          `La campaña base "${preset.base_campaign_name}" no tiene conjuntos de anuncios. Seleccioná otra campaña base.`
        );
      }
    } catch (validateErr) {
      if (validateErr.message.includes('campaña base')) throw validateErr;
    }

    // Step 4: Publish to Meta
    setPublishStep(4);
    const pubDate = new Date(dayDate);
    pubDate.setDate(pubDate.getDate() + 1);
    pubDate.setHours(settings?.campaign_hour || 5, 0, 0, 0);

    const uploadedFiles = uploadRes.data.files || uploadRes.data.creatives || [];
    const publishRes = await client.post('/meta/publish', {
      base_campaign_id: preset.base_campaign_id,
      ad_account_id: preset.ad_account_id,
      campaign_name: campaignNameStr,
      daily_budget: parseFloat(budget),
      start_time: pubDate.toISOString(),
      product_link: productLink || '',
      creatives: uploadedFiles.map((f, i) => ({
        type: f.file_type === 'video' ? 'video' : 'image',
        filename: f.filename,
        name: `${preset.name} ${f.file_type === 'video' ? 'Video' : 'Estatico'} ${dayDate} ${i + 1}`
      }))
    });

    // Step 5: Activate
    setPublishStep(5);
    await client.patch(`/campaigns/${campaignRes.data.id}`, {
      status: 'active',
      meta_campaign_id: publishRes.data.campaign_id
    }).catch(() => {});

    return {
      ...publishRes.data,
      whatsapp_link: publishRes.data.whatsapp_link
    };
  }, []);

  const startPublish = useCallback(async ({ preset, files, dates, budget, settings, generateName, batchMode, batchDays }) => {
    if (isPublishing) return;

    setIsPublishing(true);
    setShowWidget(true);
    setPublishError('');
    setPublishSuccess('');
    setPublishStep(0);
    abortRef.current = false;

    const firstCampaignName = generateName(dates[0]);
    setCampaignName(batchMode && batchDays > 1 ? `${firstCampaignName} (+${batchDays - 1} más)` : firstCampaignName);

    try {
      let lastResponse = null;
      if (batchMode && batchDays > 1) {
        const perDay = Math.floor(files.length / batchDays);
        if (perDay === 0) {
          throw new Error(`Necesitás al menos ${batchDays} archivos para ${batchDays} días`);
        }
        for (let i = 0; i < batchDays; i++) {
          if (abortRef.current) throw new Error('Publicación cancelada');
          const start = i * perDay;
          const end = i === batchDays - 1 ? files.length : start + perDay;
          lastResponse = await publishSingleDay({
            preset,
            files: files.slice(start, end),
            dayDate: dates[i],
            budget,
            settings,
            campaignNameStr: generateName(dates[i]),
            productLink: preset.product_link || ''
          });
        }
        setPublishSuccess(`${batchDays} campañas programadas exitosamente!`);
        playSuccessSound();
      } else {
        lastResponse = await publishSingleDay({
          preset,
          files,
          dayDate: dates[0],
          budget,
          settings,
          campaignNameStr: firstCampaignName,
          productLink: preset.product_link || ''
        });
        setPublishSuccess('Campaña programada exitosamente!');
        playSuccessSound();
      }
      if (lastResponse?.whatsapp_link) {
        setWhatsappLink(lastResponse.whatsapp_link);
      }
      setPublishStep(PUBLISH_STEPS.length - 1);
    } catch (err) {
      console.error('[PUBLISH ERROR]', err);
      const msg = err.response?.data?.error
        || err.response?.data?.message
        || err.message
        || 'Error desconocido al publicar.';
      setPublishError(msg);
      playErrorSound();
    } finally {
      setIsPublishing(false);
    }
  }, [isPublishing, publishSingleDay]);

  return (
    <PublishContext.Provider value={{
      isPublishing,
      publishStep,
      publishError,
      publishSuccess,
      campaignName,
      showWidget,
      whatsappLink,
      PUBLISH_STEPS,
      startPublish,
      dismissWidget,
    }}>
      {children}
    </PublishContext.Provider>
  );
}

export function usePublish() {
  return useContext(PublishContext);
}

import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

// Comprehensive translations for the AdPilot app
const translations = {
  es: {
    // Navigation
    'nav.campaigns': 'Campañas',
    'nav.schedule': 'Programar',
    'nav.library': 'Biblioteca',
    'nav.integration': 'Integración Meta',
    'nav.settings': 'Configuración',
    'nav.navigation': 'Navegación',
    'nav.account': 'Cuenta',
    'nav.logout': 'Cerrar sesión',
    'nav.tooltip.campaigns': 'Ver y gestionar tus campañas publicadas',
    'nav.tooltip.schedule': 'Automatizar y programar nuevas campañas',
    'nav.tooltip.library': 'Todos tus creativos organizados por producto',
    'nav.tooltip.integration': 'Conectar y gestionar tu cuenta de Meta Ads',
    'nav.tooltip.settings': 'Ajustes de nombre, presupuesto y horarios',

    // Theme & Language
    'theme.dark': 'Modo oscuro',
    'theme.light': 'Modo claro',
    'lang.spanish': 'Español',
    'lang.english': 'English',

    // Upload / Campaign Creation
    'upload.title': 'Programar Campañas',
    'upload.subtitle': 'Seleccioná un producto, subí los creativos y automatizá la publicación en Meta Ads.',
    'upload.selectProduct': 'Seleccioná un producto',
    'upload.duplicate': 'Duplicar Campaña',
    'upload.create': 'Crear Campaña Nueva',
    'upload.step1': 'Elegir Producto',
    'upload.step2': 'Subir Creativos',
    'upload.step3': 'Configurar Anuncio',
    'upload.step4': 'Programar y Publicar',
    'upload.mainText': 'Texto principal',
    'upload.headline': 'Titular',
    'upload.description': 'Descripción',
    'upload.link': 'Link de destino',
    'upload.generateAI': 'Generar con IA',
    'upload.generateAll': 'Generar todos los textos con IA',
    'upload.setDefault': 'Guardar como predeterminado',
    'upload.createCampaign': 'Crear Campaña',
    'upload.publish': 'Publicar',
    'upload.startDate': 'Fecha de inicio',
    'upload.dailyBudget': 'Presupuesto diario',
    'upload.livePreview': 'Vista previa en vivo',
    'upload.stepProduct': 'Producto',
    'upload.stepCreatives': 'Creativos',
    'upload.stepPublish': 'Publicar',
    'upload.dragCreatives': 'Arrastra tus creativos',
    'upload.selectCreative': 'Seleccionar creativo',
    'upload.uploadCreative': 'Subir Creativo',
    'upload.video': 'Video',
    'upload.image': 'Imagen',
    'upload.generating': 'Generando...',
    'upload.error': 'Error',
    'upload.success': 'Éxito',
    'upload.noProduct': 'Por favor selecciona un producto',
    'upload.noCreative': 'Por favor sube al menos un creativo',
    'upload.invalidLink': 'Link inválido',
    'upload.saving': 'Guardando...',
    'upload.saveProduct': 'Guardar Producto',
    'upload.loading': 'Cargando campañas...',
    'upload.batchMode': 'Publicar varios dias a la vez',
    'upload.days': 'Días',

    // Settings
    'settings.title': 'Configuración de Meta Ads',
    'settings.campaignNames': 'Nombres de Campaña',
    'settings.scheduling': 'Programación',
    'settings.budget': 'Presupuesto',
    'settings.notifications': 'Notificaciones',
    'settings.metaConfig': 'Configuración de Meta Ads',
    'settings.save': 'Guardar',
    'settings.email': 'Email',
    'settings.whatsapp': 'WhatsApp',
    'settings.startDate': 'Fecha de inicio',
    'settings.publishTime': 'Hora de publicación',
    'settings.tomorrow': 'Mañana',
    'settings.today': 'Hoy',
    'settings.custom': 'Personalizado',
    'settings.defaultAccount': 'Cuenta por defecto',
    'settings.connectMeta': 'Conectar Meta',
    'settings.namingTemplate': 'Plantilla de nombres',
    'settings.variables': 'Variables disponibles',
    'settings.preview': 'Vista previa',
    'settings.testEmail': 'Probar Email',
    'settings.testWhatsapp': 'Probar WhatsApp',
    'settings.sending': 'Enviando...',
    'settings.testSent': 'Notificación enviada',
    'settings.testFailed': 'Error al enviar notificación',
    'settings.saved': 'Configuración guardada',
    'settings.day_offset': 'Días de diferencia',
    'settings.loading': 'Cargando configuración...',

    // Campaigns
    'campaigns.title': 'Campañas',
    'campaigns.active': 'Activa',
    'campaigns.paused': 'Pausada',
    'campaigns.archived': 'Archivada',
    'campaigns.status': 'Estado',
    'campaigns.product': 'Producto',
    'campaigns.budget': 'Presupuesto',
    'campaigns.spend': 'Gastado',
    'campaigns.purchases': 'Compras',
    'campaigns.cpa': 'CPA',
    'campaigns.roas': 'ROAS',
    'campaigns.impressions': 'Impresiones',
    'campaigns.clicks': 'Clicks',
    'campaigns.ctr': 'CTR',
    'campaigns.cpc': 'CPC',
    'campaigns.syncMetrics': 'Sincronizar Métricas',
    'campaigns.syncing': 'Sincronizando...',
    'campaigns.synced': 'Sincronizado',
    'campaigns.noCampaigns': 'No hay campañas',
    'campaigns.createFirst': 'Crea tu primera campaña',
    'campaigns.createNew': 'Crear Nueva',
    'campaigns.stats': {
      'total': 'Total de Campañas',
      'active': 'Activas',
      'totalSpend': 'Gasto Total',
      'totalPurchases': 'Compras Totales',
      'avgCPA': 'CPA Promedio',
      'avgROAS': 'ROAS Promedio',
    },

    // Library
    'library.title': 'Biblioteca',
    'library.products': 'Productos',
    'library.creatives': 'Creativos',
    'library.noProducts': 'No hay productos',
    'library.noCreatives': 'No hay creativos para este producto',
    'library.delete': 'Eliminar',
    'library.edit': 'Editar',
    'library.organize': 'Organizar por producto',

    // Integration
    'integration.title': 'Integración Meta',
    'integration.connect': 'Conectar Meta Ads',
    'integration.connected': 'Conectado',
    'integration.notConnected': 'No conectado',
    'integration.status': 'Estado',
    'integration.accounts': 'Cuentas',
    'integration.reconnect': 'Reconectar',
    'integration.disconnect': 'Desconectar',

    // Common
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.save': 'Guardar',
    'common.loading': 'Cargando...',
    'common.test': 'Probar',
    'common.connected': 'Conectado',
    'common.notConnected': 'No conectado',
    'common.required': 'Requerido',
    'common.optional': 'Opcional',
    'common.success': 'Éxito',
    'common.error': 'Error',
    'common.tryAgain': 'Intentar de nuevo',
    'common.close': 'Cerrar',
    'common.confirm': 'Confirmar',
    'common.searchProducts': 'Buscar productos...',

    // Publish & Campaign Creation
    'publish.title': 'Publicando...',
    'publish.publishing': 'Publicando...',
    'publish.campaign_published': 'Campaña publicada',
    'publish.success': 'Campaña publicada exitosamente',
    'publish.successMessage': 'La campaña ya está activa en Meta Ads',
    'publish.error': 'Error al publicar',
    'publish.step.validate': 'Validando datos...',
    'publish.step.upload': 'Subiendo creativos...',
    'publish.step.create': 'Creando campaña...',
    'publish.step.configure': 'Configurando anuncio...',
    'publish.step.launch': 'Lanzando campaña...',
    'publish.notifyWhatsapp': 'Notificar por WhatsApp',

    // Meta Status
    'meta.connected': 'Meta Conectado',
    'meta.notConnected': 'Meta No Conectado',
    'meta.clickToConnect': 'Click para conectar Meta',

    // Validation & Errors
    'error.invalidEmail': 'Email inválido',
    'error.required': 'Este campo es requerido',
    'error.minLength': 'Mínimo de caracteres requerido',
    'error.maxLength': 'Máximo de caracteres excedido',
    'error.invalidUrl': 'URL inválida',
    'error.fileNotSupported': 'Tipo de archivo no soportado',
    'error.fileTooLarge': 'Archivo muy grande',
    'error.noPermission': 'No tienes permiso para realizar esta acción',
    'error.tryAgain': 'Intentar de nuevo',

    // Auth
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Registrarse',
    'auth.email': 'Email',
    'auth.password': 'Contraseña',
    'auth.name': 'Nombre',
    'auth.signIn': 'Ingresar',
    'auth.signUp': 'Crear cuenta',
    'auth.alreadyHaveAccount': 'Ya tienes cuenta',
    'auth.dontHaveAccount': 'No tienes cuenta',
    'auth.forgotPassword': 'Olvidé mi contraseña',
    'auth.invalidCredentials': 'Credenciales inválidas',
    'auth.accountCreated': 'Cuenta creada exitosamente',
    'auth.logoutSuccess': 'Sesión cerrada',

    // Currency
    'currency.usd': 'USD',
    'currency.ars': 'ARS',
    'currency.eur': 'EUR',
    'currency.brl': 'BRL',
  },
  en: {
    // Navigation
    'nav.campaigns': 'Campaigns',
    'nav.schedule': 'Schedule',
    'nav.library': 'Library',
    'nav.integration': 'Meta Integration',
    'nav.settings': 'Settings',
    'nav.navigation': 'Navigation',
    'nav.account': 'Account',
    'nav.logout': 'Logout',
    'nav.tooltip.campaigns': 'View and manage your published campaigns',
    'nav.tooltip.schedule': 'Automate and schedule new campaigns',
    'nav.tooltip.library': 'All your creatives organized by product',
    'nav.tooltip.integration': 'Connect and manage your Meta Ads account',
    'nav.tooltip.settings': 'Settings for names, budget, and schedules',

    // Theme & Language
    'theme.dark': 'Dark Mode',
    'theme.light': 'Light Mode',
    'lang.spanish': 'Español',
    'lang.english': 'English',

    // Upload / Campaign Creation
    'upload.title': 'Schedule Campaigns',
    'upload.subtitle': 'Select a product, upload your creatives and automate publishing to Meta Ads.',
    'upload.selectProduct': 'Select a product',
    'upload.duplicate': 'Duplicate Campaign',
    'upload.create': 'Create New Campaign',
    'upload.step1': 'Select Product',
    'upload.step2': 'Upload Creatives',
    'upload.step3': 'Configure Ad',
    'upload.step4': 'Schedule & Publish',
    'upload.mainText': 'Main Text',
    'upload.headline': 'Headline',
    'upload.description': 'Description',
    'upload.link': 'Destination Link',
    'upload.generateAI': 'Generate with AI',
    'upload.generateAll': 'Generate all texts with AI',
    'upload.setDefault': 'Save as default',
    'upload.createCampaign': 'Create Campaign',
    'upload.publish': 'Publish',
    'upload.startDate': 'Start Date',
    'upload.dailyBudget': 'Daily Budget',
    'upload.livePreview': 'Live Preview',
    'upload.stepProduct': 'Product',
    'upload.stepCreatives': 'Creatives',
    'upload.stepPublish': 'Publish',
    'upload.dragCreatives': 'Drag your creatives here',
    'upload.selectCreative': 'Select Creative',
    'upload.uploadCreative': 'Upload Creative',
    'upload.video': 'Video',
    'upload.image': 'Image',
    'upload.generating': 'Generating...',
    'upload.error': 'Error',
    'upload.success': 'Success',
    'upload.noProduct': 'Please select a product',
    'upload.noCreative': 'Please upload at least one creative',
    'upload.invalidLink': 'Invalid link',
    'upload.saving': 'Saving...',
    'upload.saveProduct': 'Save Product',
    'upload.loading': 'Loading campaigns...',
    'upload.batchMode': 'Publish multiple days at once',
    'upload.days': 'Days',

    // Settings
    'settings.title': 'Meta Ads Settings',
    'settings.campaignNames': 'Campaign Names',
    'settings.scheduling': 'Scheduling',
    'settings.budget': 'Budget',
    'settings.notifications': 'Notifications',
    'settings.metaConfig': 'Meta Ads Configuration',
    'settings.save': 'Save',
    'settings.email': 'Email',
    'settings.whatsapp': 'WhatsApp',
    'settings.startDate': 'Start Date',
    'settings.publishTime': 'Publish Time',
    'settings.tomorrow': 'Tomorrow',
    'settings.today': 'Today',
    'settings.custom': 'Custom',
    'settings.defaultAccount': 'Default Account',
    'settings.connectMeta': 'Connect Meta',
    'settings.namingTemplate': 'Naming Template',
    'settings.variables': 'Available Variables',
    'settings.preview': 'Preview',
    'settings.testEmail': 'Test Email',
    'settings.testWhatsapp': 'Test WhatsApp',
    'settings.sending': 'Sending...',
    'settings.testSent': 'Notification sent',
    'settings.testFailed': 'Error sending notification',
    'settings.saved': 'Settings saved',
    'settings.day_offset': 'Day Offset',
    'settings.loading': 'Loading settings...',

    // Campaigns
    'campaigns.title': 'Campaigns',
    'campaigns.active': 'Active',
    'campaigns.paused': 'Paused',
    'campaigns.archived': 'Archived',
    'campaigns.status': 'Status',
    'campaigns.product': 'Product',
    'campaigns.budget': 'Budget',
    'campaigns.spend': 'Spent',
    'campaigns.purchases': 'Purchases',
    'campaigns.cpa': 'CPA',
    'campaigns.roas': 'ROAS',
    'campaigns.impressions': 'Impressions',
    'campaigns.clicks': 'Clicks',
    'campaigns.ctr': 'CTR',
    'campaigns.cpc': 'CPC',
    'campaigns.syncMetrics': 'Sync Metrics',
    'campaigns.syncing': 'Syncing...',
    'campaigns.synced': 'Synced',
    'campaigns.noCampaigns': 'No campaigns',
    'campaigns.createFirst': 'Create your first campaign',
    'campaigns.createNew': 'Create New',
    'campaigns.stats': {
      'total': 'Total Campaigns',
      'active': 'Active',
      'totalSpend': 'Total Spend',
      'totalPurchases': 'Total Purchases',
      'avgCPA': 'Average CPA',
      'avgROAS': 'Average ROAS',
    },

    // Library
    'library.title': 'Library',
    'library.products': 'Products',
    'library.creatives': 'Creatives',
    'library.noProducts': 'No products',
    'library.noCreatives': 'No creatives for this product',
    'library.delete': 'Delete',
    'library.edit': 'Edit',
    'library.organize': 'Organize by product',

    // Integration
    'integration.title': 'Meta Integration',
    'integration.connect': 'Connect Meta Ads',
    'integration.connected': 'Connected',
    'integration.notConnected': 'Not Connected',
    'integration.status': 'Status',
    'integration.accounts': 'Accounts',
    'integration.reconnect': 'Reconnect',
    'integration.disconnect': 'Disconnect',

    // Common
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.save': 'Save',
    'common.loading': 'Loading...',
    'common.test': 'Test',
    'common.connected': 'Connected',
    'common.notConnected': 'Not Connected',
    'common.required': 'Required',
    'common.optional': 'Optional',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.tryAgain': 'Try Again',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.searchProducts': 'Search products...',

    // Publish & Campaign Creation
    'publish.title': 'Publishing...',
    'publish.publishing': 'Publishing...',
    'publish.campaign_published': 'Campaign published',
    'publish.success': 'Campaign published successfully',
    'publish.successMessage': 'The campaign is now active on Meta Ads',
    'publish.error': 'Error publishing campaign',
    'publish.step.validate': 'Validating data...',
    'publish.step.upload': 'Uploading creatives...',
    'publish.step.create': 'Creating campaign...',
    'publish.step.configure': 'Configuring ad...',
    'publish.step.launch': 'Launching campaign...',
    'publish.notifyWhatsapp': 'Notify via WhatsApp',

    // Meta Status
    'meta.connected': 'Meta Connected',
    'meta.notConnected': 'Meta Not Connected',
    'meta.clickToConnect': 'Click to connect Meta',

    // Validation & Errors
    'error.invalidEmail': 'Invalid email',
    'error.required': 'This field is required',
    'error.minLength': 'Minimum character length required',
    'error.maxLength': 'Maximum character length exceeded',
    'error.invalidUrl': 'Invalid URL',
    'error.fileNotSupported': 'File type not supported',
    'error.fileTooLarge': 'File is too large',
    'error.noPermission': 'You do not have permission to perform this action',
    'error.tryAgain': 'Try Again',

    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Name',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.alreadyHaveAccount': 'Already have an account',
    'auth.dontHaveAccount': 'Don\'t have an account',
    'auth.forgotPassword': 'Forgot password',
    'auth.invalidCredentials': 'Invalid credentials',
    'auth.accountCreated': 'Account created successfully',
    'auth.logoutSuccess': 'Logged out successfully',

    // Currency
    'currency.usd': 'USD',
    'currency.ars': 'ARS',
    'currency.eur': 'EUR',
    'currency.brl': 'BRL',
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('adpilot-language') || 'es';
  });

  useEffect(() => {
    localStorage.setItem('adpilot-language', language);
  }, [language]);

  const t = (key) => {
    const langTranslations = translations[language] || translations['es'];
    // Direct flat key lookup (keys use dot notation as-is, e.g. 'nav.campaigns')
    if (key in langTranslations) {
      const val = langTranslations[key];
      // If value is a string, return it; if it's an object, return as-is
      return val != null ? val : key;
    }
    return key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

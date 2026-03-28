import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowRight, CheckCircle, Zap, BarChart3, Bell, Copy, Calendar, Plug, Upload, Rocket, Play, Shield, ChevronRight, Star, MousePointerClick } from 'lucide-react';

// Animated counter hook
function useCounter(end, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnView) { setStarted(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return { count, ref };
}

// Fade-in on scroll component
function FadeIn({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
         style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// Floating particles background
function ParticlesBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="absolute rounded-full bg-violet-500/10"
          style={{
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float-particle ${Math.random() * 8 + 6}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Landing() {
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const stat1 = useCounter(500, 2000);
  const stat2 = useCounter(98, 2000);
  const stat3 = useCounter(10, 1500);

  const features = [
    {
      icon: Copy,
      title: 'Duplicar campañas',
      desc: 'Cloná cualquier campaña existente de Meta Ads, reemplazando solo los creativos. Toda la configuración original se mantiene.',
      color: 'from-violet-500 to-purple-600'
    },
    {
      icon: Rocket,
      title: 'Crear desde cero',
      desc: 'Armá campañas completamente nuevas con objetivo, CTA, textos y creativos personalizados.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Calendar,
      title: 'Programación automática',
      desc: 'Seleccioná fechas futuras y dejá que AdPilot publique tus campañas automáticamente.',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: Upload,
      title: 'Multi-creativos',
      desc: 'Subí múltiples imágenes y videos a la vez. Soportamos JPG, PNG, MP4 y más formatos.',
      color: 'from-orange-500 to-amber-500'
    },
    {
      icon: Bell,
      title: 'Notificaciones en vivo',
      desc: 'Recibí alertas en tiempo real del estado de publicación, con sonido y notificaciones WhatsApp.',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: BarChart3,
      title: 'Dashboard completo',
      desc: 'Visualizá todas tus campañas publicadas con estado, métricas y acciones rápidas.',
      color: 'from-indigo-500 to-violet-500'
    }
  ];

  const steps = [
    { num: '01', title: 'Conectá tu Meta Ads', desc: 'Vinculá tu cuenta publicitaria en segundos con autenticación segura OAuth.', icon: Plug },
    { num: '02', title: 'Configurá tus productos', desc: 'Creá presets de productos con cuenta, campaña base y presupuesto predeterminado.', icon: MousePointerClick },
    { num: '03', title: 'Subí creativos', desc: 'Arrastrá imágenes y videos a la plataforma. Se asignan automáticamente al producto.', icon: Upload },
    { num: '04', title: 'Publicá o programá', desc: 'Publicá al instante o programá para una fecha futura. Todo automático.', icon: Rocket }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-hidden">
      {/* CSS Animations */}
      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(15px); opacity: 0.8; }
          50% { transform: translateY(-15px) translateX(-10px); opacity: 0.5; }
          75% { transform: translateY(-40px) translateX(20px); opacity: 0.7; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6), 0 0 80px rgba(139, 92, 246, 0.2); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slide-up-fade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(120px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
        }
        .animate-gradient { background-size: 200% 200%; animation: gradient-shift 4s ease infinite; }
        .animate-glow { animation: glow-pulse 3s ease-in-out infinite; }
        .hero-text { animation: slide-up-fade 0.8s ease-out forwards; }
        .hero-text-delay { animation: slide-up-fade 0.8s ease-out 0.2s forwards; opacity: 0; }
        .hero-text-delay2 { animation: slide-up-fade 0.8s ease-out 0.4s forwards; opacity: 0; }
        .card-shine { position: relative; overflow: hidden; }
        .card-shine::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(255,255,255,0.03) 50%,
            transparent 100%
          );
          animation: shimmer 6s ease-in-out infinite;
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">AdPilot</span>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/login" className="text-gray-400 hover:text-white font-medium transition-colors px-4 py-2">
              Ingresar
            </Link>
            <Link to="/register" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-900/40 transition-all hover:-translate-y-0.5 active:translate-y-0">
              Comenzar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <ParticlesBg />
        {/* Radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="hero-text inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-gray-300">Plataforma de automatización Meta Ads</span>
            </div>

            <h1 className="hero-text text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
              Publicá campañas en{' '}
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent animate-gradient">
                Meta Ads
              </span>
              <br />
              <span className="text-gray-400">en piloto automático</span>
            </h1>

            <p className="hero-text-delay text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Duplicá campañas existentes, creá nuevas desde cero, subí creativos y programá la publicación.
              Todo desde un solo lugar, sin tocar el Ads Manager.
            </p>

            <div className="hero-text-delay2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="group inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-violet-900/40 transition-all hover:-translate-y-1 active:translate-y-0 animate-glow">
                <span>Empezar ahora</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="inline-flex items-center space-x-2 text-gray-400 hover:text-white px-6 py-4 transition-colors group">
                <Play size={18} className="group-hover:scale-110 transition-transform" />
                <span>Ya tengo cuenta</span>
              </Link>
            </div>
          </div>

          {/* Floating UI Preview mockup */}
          <div className="mt-20 relative max-w-3xl mx-auto hero-text-delay2">
            <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-1 shadow-2xl shadow-violet-950/50">
              <div className="bg-[#12121f] rounded-xl overflow-hidden">
                {/* Mock browser bar */}
                <div className="flex items-center space-x-2 px-4 py-3 bg-white/5 border-b border-white/5">
                  <div className="flex space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white/5 rounded-lg px-4 py-1 text-xs text-gray-500 flex items-center space-x-2">
                      <Shield size={10} className="text-emerald-400" />
                      <span>app.adpilot.io/dashboard</span>
                    </div>
                  </div>
                </div>
                {/* Mock dashboard content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      <Zap size={14} className="text-white" />
                    </div>
                    <div className="text-sm font-semibold text-white/80">Programar Campañas</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['Crema Facial', 'Sérum Vitamina C', 'Pack Skincare'].map((name, i) => (
                      <div key={i} className={`p-3 rounded-lg border transition-all duration-500 ${i === 0 ? 'bg-violet-500/10 border-violet-500/30' : 'bg-white/[0.03] border-white/5'}`}
                           style={{ animation: `slide-up-fade 0.5s ease-out ${0.6 + i * 0.15}s forwards`, opacity: 0 }}>
                        <div className="w-full h-16 rounded bg-gradient-to-br from-white/5 to-white/[0.02] mb-2" />
                        <p className="text-xs text-gray-400">{name}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ animation: 'slide-up-fade 1s ease-out 1.2s forwards', opacity: 0 }} />
                    </div>
                    <span className="text-[10px] text-violet-400">Publicando...</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Glow beneath */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-2/3 h-24 bg-violet-600/20 blur-[60px] rounded-full" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <FadeIn>
              <div ref={stat1.ref}>
                <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">+{stat1.count}</p>
                <p className="text-gray-500 mt-2 text-sm">Campañas publicadas</p>
              </div>
            </FadeIn>
            <FadeIn delay={150}>
              <div ref={stat2.ref}>
                <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{stat2.count}%</p>
                <p className="text-gray-500 mt-2 text-sm">Tasa de éxito en publicación</p>
              </div>
            </FadeIn>
            <FadeIn delay={300}>
              <div ref={stat3.ref}>
                <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">{stat3.count}x</p>
                <p className="text-gray-500 mt-2 text-sm">Más rápido que manualmente</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="relative py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.08),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-widest text-violet-400 font-semibold">Proceso</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mt-3">
                ¿Cómo funciona?
              </h2>
              <p className="text-gray-500 mt-4 max-w-lg mx-auto">Cuatro pasos simples para automatizar tus campañas de Meta Ads.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div className="card-shine group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-violet-500/30 transition-all duration-500 h-full">
                  {/* Step number */}
                  <div className="text-5xl font-extrabold text-white/[0.04] absolute top-3 right-4 select-none group-hover:text-violet-500/10 transition-colors duration-500">
                    {step.num}
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-violet-900/30 transition-all duration-300`}>
                    <step.icon size={20} className="text-violet-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                  {i < 3 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <ChevronRight size={16} className="text-violet-500/30" />
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.1),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-widest text-violet-400 font-semibold">Funcionalidades</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mt-3">
                Todo lo que necesitás
              </h2>
              <p className="text-gray-500 mt-4 max-w-lg mx-auto">Herramientas diseñadas para agilizar tu flujo de trabajo con Meta Ads.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div
                  className={`card-shine group relative bg-white/[0.03] border rounded-2xl p-6 transition-all duration-500 cursor-default h-full ${
                    hoveredFeature === i ? 'border-violet-500/40 bg-white/[0.06] scale-[1.02]' : 'border-white/[0.06] hover:border-white/10'
                  }`}
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                       style={{ boxShadow: hoveredFeature === i ? `0 8px 30px -4px rgba(139, 92, 246, 0.3)` : 'none' }}>
                    <f.icon size={20} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonial */}
      <section className="relative py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="card-shine bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
              <div className="flex justify-center mb-6 space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-xl sm:text-2xl text-gray-300 font-light leading-relaxed mb-8 italic">
                "Antes tardaba horas en el Ads Manager duplicando campañas y cambiando creativos.
                Ahora lo hago en 2 minutos con AdPilot."
              </p>
              <div>
                <p className="font-semibold text-white">Marketing Manager</p>
                <p className="text-sm text-gray-500">Agencia de Marketing Digital</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-widest text-violet-400 font-semibold">Precios</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mt-3">
                Planes simples y transparentes
              </h2>
              <p className="text-gray-500 mt-4">Elegí el plan que mejor se adapte a tu negocio.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <FadeIn delay={0}>
              <div className="card-shine bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:border-white/10 transition-all duration-500 h-full flex flex-col">
                <h3 className="text-xl font-bold mb-1">Starter</h3>
                <p className="text-gray-500 text-sm mb-6">Para emprendedores</p>
                <div className="text-4xl font-extrabold mb-6">
                  $29<span className="text-lg font-normal text-gray-600">/mes</span>
                </div>
                <ul className="space-y-3.5 mb-8 flex-1">
                  {['Hasta 5 campañas', '1 cuenta Meta Ads', 'Soporte por email', 'Duplicar campañas'].map((item, i) => (
                    <li key={i} className="flex items-center space-x-3">
                      <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-gray-400 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block w-full text-center border border-violet-500/40 text-violet-400 py-3 rounded-xl font-semibold hover:bg-violet-500/10 transition-all">
                  Elegir plan
                </Link>
              </div>
            </FadeIn>

            {/* Pro */}
            <FadeIn delay={150}>
              <div className="card-shine relative bg-gradient-to-b from-violet-600/[0.1] to-indigo-600/[0.05] border-2 border-violet-500/30 rounded-2xl p-8 transition-all duration-500 h-full flex flex-col" style={{ boxShadow: '0 0 60px -10px rgba(139, 92, 246, 0.2)' }}>
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs px-4 py-1 rounded-full font-bold tracking-wide shadow-lg shadow-violet-900/40">
                  Más popular
                </div>
                <h3 className="text-xl font-bold mb-1">Pro</h3>
                <p className="text-gray-500 text-sm mb-6">Para agencias</p>
                <div className="text-4xl font-extrabold mb-6">
                  $79<span className="text-lg font-normal text-gray-600">/mes</span>
                </div>
                <ul className="space-y-3.5 mb-8 flex-1">
                  {['Hasta 25 campañas', '3 cuentas Meta Ads', 'Análisis avanzado', 'Soporte prioritario', 'Crear campañas desde cero', 'Notificaciones WhatsApp'].map((item, i) => (
                    <li key={i} className="flex items-center space-x-3">
                      <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-gray-400 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block w-full text-center bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-900/40 transition-all hover:-translate-y-0.5">
                  Elegir plan
                </Link>
              </div>
            </FadeIn>

            {/* Agency */}
            <FadeIn delay={300}>
              <div className="card-shine bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:border-white/10 transition-all duration-500 h-full flex flex-col">
                <h3 className="text-xl font-bold mb-1">Agency</h3>
                <p className="text-gray-500 text-sm mb-6">Para empresas grandes</p>
                <div className="text-4xl font-extrabold mb-6">
                  $199<span className="text-lg font-normal text-gray-600">/mes</span>
                </div>
                <ul className="space-y-3.5 mb-8 flex-1">
                  {['Campañas ilimitadas', 'Cuentas Meta ilimitadas', 'API de integración', 'Soporte dedicado', 'Auto-publicación Drive', 'Reportes personalizados'].map((item, i) => (
                    <li key={i} className="flex items-center space-x-3">
                      <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-gray-400 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block w-full text-center border border-violet-500/40 text-violet-400 py-3 rounded-xl font-semibold hover:bg-violet-500/10 transition-all">
                  Elegir plan
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-6">
              Dejá de perder tiempo en el{' '}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Ads Manager</span>
            </h2>
            <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
              Automatizá la publicación de tus campañas y dedicá tu tiempo a lo que realmente importa: hacer crecer tu negocio.
            </p>
            <Link to="/register" className="group inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-violet-900/40 transition-all hover:-translate-y-1 animate-glow">
              <span>Comenzar gratis</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Zap size={14} className="text-white" />
              </div>
              <span className="font-bold bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">AdPilot</span>
            </div>
            <p className="text-sm text-gray-600">
              © 2025 AdPilot. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { BookOpen, Mail, Lock, User, ArrowRight, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const registerSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Una mayúscula')
    .regex(/[a-z]/, 'Una minúscula')
    .regex(/[0-9]/, 'Un número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError(null);
    try {
      const { data: loginData } = await authApi.register(
        data.email,
        data.password,
        data.name
      );
      setAuth(loginData.user, loginData.accessToken, loginData.refreshToken);
      navigate('/catalog');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-stone-950">
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] bg-stone-900/50 backdrop-blur-xl border-r border-stone-800/50 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent" />
        
        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-amber-500" />
          </div>
          <span className="font-display text-2xl text-stone-100 tracking-tight">
            Bibliotech<span className="text-amber-500">Premium</span>
          </span>
        </Link>

        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            <Library className="w-24 h-24 text-amber-500/20 mb-6" />
          </motion.div>
          <h2 className="font-display text-4xl xl:text-5xl text-stone-100 tracking-tight leading-tight">
            Unite a la<br />
            <span className="text-amber-500">comunidad.</span>
          </h2>
          <p className="text-stone-400 text-lg max-w-md leading-relaxed">
            Miles de lectores te esperan. Descubrí, prestá y disfrutá de la mejor experiencia bibliotecaria.
          </p>
        </div>

        <div className="text-stone-500 text-sm font-sans relative z-10">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="link">
            Iniciá sesión
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275], delay: 0.1 }}
            className="space-y-8"
          >
            <div className="lg:hidden mb-10">
              <Link to="/" className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-amber-500" />
                </div>
                <span className="font-display text-3xl text-stone-100 tracking-tight">
                  Bibliotech<span className="text-amber-500">Premium</span>
                </span>
              </Link>
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-3xl xl:text-4xl text-stone-100 tracking-tight">
                Crear cuenta
              </h1>
              <p className="text-stone-500 font-sans">
                Completá tus datos para unirte
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-500 text-sm font-sans"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="input-label">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                  <input
                    {...register('name')}
                    type="text"
                    placeholder="Juan Pérez"
                    className={cn('input-field pl-12', errors.name && 'border-rose-500/50')}
                  />
                </div>
                {errors.name && (
                  <p className="text-rose-500 text-sm font-sans">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="input-label">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="tu@email.com"
                    className={cn('input-field pl-12', errors.email && 'border-rose-500/50')}
                  />
                </div>
                {errors.email && (
                  <p className="text-rose-500 text-sm font-sans">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="input-label">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="••••••••"
                    className={cn('input-field pl-12', errors.password && 'border-rose-500/50')}
                  />
                </div>
                {errors.password && (
                  <p className="text-rose-500 text-sm font-sans">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="input-label">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    placeholder="••••••••"
                    className={cn('input-field pl-12', errors.confirmPassword && 'border-rose-500/50')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-rose-500 text-sm font-sans">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'btn-primary w-full flex items-center justify-center gap-2',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loading ? (
                  <span className="animate-pulse font-sans">Creando cuenta...</span>
                ) : (
                  <>
                    <span className="font-sans font-semibold">Crear cuenta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-left text-stone-400 font-sans text-sm lg:hidden">
                ¿Ya tenés cuenta?{' '}
                <Link to="/login" className="link">
                  Iniciá sesión
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
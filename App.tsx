import React, { useState, useEffect, useMemo, FC, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, Polygon, CircleMarker } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import * as Recharts from 'recharts';
import { auth, db, storage, isFirebaseConfigured } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  onAuthStateChanged, 
  signOut,
  updateProfile,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser
} from "firebase/auth";
import { 
    collection, 
    doc, 
    getDocs, 
    setDoc, 
    addDoc, 
    deleteDoc, 
    writeBatch, 
    getDoc,
    query,
    where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
const { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } = Recharts;

import { Obra, EtapaLead, User, Tarefa, TipoTarefa, Contato, FaseObra, Proposta, Representada, Metas, Region } from './types';
import { ETAPA_LEAD_OPTIONS, FASE_OBRA_OPTIONS, REPRESENTADA_PRODUTOS_MAP, MOCK_OBRAS } from './constants';
import {
  ListIcon, MapIcon, CheckSquareIcon, BarChartIcon, UserIcon, EyeIcon, EyeOffIcon, XIcon, PlusIcon, PhoneIcon, MailIcon, BriefcaseIcon, EditIcon, TrashIcon, PlusCircleIcon, RouteIcon, NavigationIcon, MyLocationIcon, DownloadIcon, UploadIcon
} from './components/Icons';

// --- HELPERS & MOCKS ---
const getCurrentMonthId = () => new Date().toISOString().slice(0, 7); // YYYY-MM

const createDefaultMetas = (monthId: string): Metas => {
    const defaultPorRepresentada = Object.values(Representada).reduce((acc, rep) => {
        acc[rep] = 0;
        return acc;
    }, {} as Record<Representada, number>);

    return {
        id: monthId,
        vendasTotais: 100000,
        visitas: 20,
        ligacoes: 40,
        porRepresentada: defaultPorRepresentada,
    };
};

const MOCK_METAS: Metas = createDefaultMetas(getCurrentMonthId());

const MOCK_USER: User = {
    id: 'mock_user_id',
    nomeCompleto: 'Usuário Demo',
    email: 'demo@obramap.com',
};

const getFirebaseErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'O formato do e-mail é inválido.';
    case 'auth/user-disabled':
      return 'Este usuário foi desabilitado.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha inválidos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'O cadastro por e-mail/senha não está habilitado.';
    case 'permission-denied':
        return 'Permissão negada. Verifique as regras de segurança do seu banco de dados (Firestore).';
    default:
      console.error("Firebase Error:", errorCode);
      return 'Ocorreu um erro. Por favor, tente novamente.';
  }
};


// --- AUTH COMPONENTS ---
const AuthLayout: FC<{ title: string, subtitle: string, children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
    {!isFirebaseConfigured && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-300 text-yellow-800 text-center p-2 text-sm shadow-sm z-10">
            Modo Demonstração. Nenhum dado será salvo.
        </div>
    )}
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block bg-orange-400 p-4 rounded-2xl shadow-lg">
          <BriefcaseIcon className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mt-4">{title}</h1>
        <p className="text-gray-500">{subtitle}</p>
      </div>
      {children}
    </div>
  </div>
);

const LoginPage: FC<{ setPage: (page: 'login' | 'signup' | 'forgot') => void; onMockLogin: (user: User) => void; }> = ({ setPage, onMockLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState<FirebaseUser | null>(null);

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!isFirebaseConfigured) {
        setTimeout(() => {
            if (email === 'demo@obramap.com' && password === 'demo123') {
                onMockLogin(MOCK_USER);
            } else {
                setError('Credenciais de demonstração inválidas. Use demo@obramap.com e demo123.');
                setIsLoading(false);
            }
        }, 1000);
        return;
    }

    if (!auth) return;
    
    setNeedsVerification(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        setNeedsVerification(userCredential.user);
        setError("Seu e-mail ainda não foi verificado. Por favor, verifique sua caixa de entrada.");
        await signOut(auth);
      }
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!needsVerification) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
        await sendEmailVerification(needsVerification);
        setSuccess("Um novo e-mail de verificação foi enviado com sucesso!");
        setNeedsVerification(null);
    } catch (error) {
        setError("Não foi possível reenviar o e-mail. Tente novamente mais tarde.");
    } finally {
        setIsLoading(false);
    }
  };


  return (
    <AuthLayout title="ObraMap" subtitle="Faça login para continuar">
      <div className="bg-white p-6 rounded-lg shadow-md w-full">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="relative">
            <label className="text-sm font-medium text-gray-700">Senha</label>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha"
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center">
              {showPassword ? <EyeOffIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
        {needsVerification && (
            <button onClick={handleResendVerification} disabled={isLoading} className="w-full mt-2 text-sm text-blue-600 hover:underline disabled:text-gray-400">
                {isLoading ? 'Enviando...' : 'Reenviar e-mail de verificação'}
            </button>
        )}
        <button onClick={handleLogin} disabled={isLoading} className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400">
            {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
      <div className="text-center mt-4 text-sm">
        <button onClick={() => setPage('forgot')} className="text-blue-600 hover:underline">Esqueceu a senha?</button>
        <span className="mx-2 text-gray-400">|</span>
        <button onClick={() => setPage('signup')} className="text-blue-600 hover:underline">Cadastre-se</button>
      </div>
    </AuthLayout>
  );
};

const SignupPage: FC<{ setPage: (page: 'login' | 'signup' | 'forgot') => void; onMockLogin: (user: User) => void; }> = ({ setPage, onMockLogin }) => {
    const [nomeCompleto, setNomeCompleto] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSignup = async () => {
        setError('');
        setSuccess('');
        if (!nomeCompleto || !email || !senha || !confirmarSenha) {
            setError('Todos os campos são obrigatórios.');
            return;
        }
        if (senha !== confirmarSenha) {
            setError('As senhas não coincidem.');
            return;
        }
        if (senha.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setIsLoading(true);

        if (!isFirebaseConfigured) {
            setSuccess('Conta de demonstração criada com sucesso! Redirecionando...');
            setTimeout(() => {
                onMockLogin({ id: `mock_${Date.now()}`, nomeCompleto, email });
            }, 2000);
            return;
        }
        
        if (!auth) return;
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            await updateProfile(userCredential.user, { displayName: nomeCompleto });
            await sendEmailVerification(userCredential.user);
            setSuccess('Cadastro realizado! Um e-mail de verificação foi enviado. Por favor, verifique sua caixa de entrada antes de fazer login.');
            setTimeout(() => setPage('login'), 5000);
        } catch (err: any) {
            setError(getFirebaseErrorMessage(err.code));
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <AuthLayout title="Criar Conta" subtitle="Preencha seus dados para começar">
            <div className="bg-white p-6 rounded-lg shadow-md w-full">
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                        <input type="text" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="relative">
                        <label className="text-sm font-medium text-gray-700">Senha</label>
                        <input type={showPassword ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center">
                            {showPassword ? <EyeOffIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}
                        </button>
                    </div>
                    <div className="relative">
                        <label className="text-sm font-medium text-gray-700">Confirmar Senha</label>
                        <input type={showConfirmPassword ? 'text' : 'password'} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                         <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center">
                            {showConfirmPassword ? <EyeOffIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}
                        </button>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                {success && <p className="text-green-600 text-sm mt-2 text-center">{success}</p>}
                <button onClick={handleSignup} disabled={isLoading || !!success} className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400">
                    {isLoading ? 'Criando...' : 'Criar Conta'}
                </button>
            </div>
             <div className="text-center mt-4 text-sm">
                <button onClick={() => setPage('login')} className="text-blue-600 hover:underline">Já tem uma conta? Faça login</button>
            </div>
         </AuthLayout>
    );
};

const ForgotPasswordPage: FC<{ setPage: (page: 'login' | 'signup' | 'forgot') => void; }> = ({ setPage }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!isFirebaseConfigured) {
            setError('Recuperação de senha não disponível no modo demonstração.');
            return;
        }

        if (!auth) return;
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess('E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.');
        } catch (err: any) {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
                setError('E-mail não encontrado.');
            } else {
                setError('Ocorreu um erro. Tente novamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout title="Recuperar Senha" subtitle="Digite seu e-mail para receber o link de redefinição">
             <div className="bg-white p-6 rounded-lg shadow-md w-full">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
                <button onClick={handleResetPassword} disabled={isLoading || !!success} className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400">
                    {isLoading ? 'Enviando...' : 'Enviar Link'}
                </button>
            </div>
            <div className="text-center mt-4 text-sm">
                <button onClick={() => setPage('login')} className="text-blue-600 hover:underline">Voltar para Login</button>
            </div>
        </AuthLayout>
    );
};

const AuthManager: FC<{
  page: 'login' | 'signup' | 'forgot';
  setPage: (page: 'login' | 'signup' | 'forgot') => void;
  onMockLogin: (user: User) => void;
}> = ({ page, setPage, onMockLogin }) => {
  if (page === 'signup') {
    return <SignupPage setPage={setPage} onMockLogin={onMockLogin} />;
  }
  if (page === 'forgot') {
    return <ForgotPasswordPage setPage={setPage} />;
  }
  return <LoginPage setPage={setPage} onMockLogin={onMockLogin} />;
};


const REGION_COLORS = ['blue', 'green', 'purple', 'orange', 'red', 'yellow'];

const MapFlyToController: FC<{ flyToTarget: [number, number] | null; onFlyToComplete: () => void; }> = ({ flyToTarget, onFlyToComplete }) => {
    const map = useMapEvents({});

    useEffect(() => {
        if (flyToTarget) {
            const onMoveEnd = () => {
                map.off('moveend', onMoveEnd); 
                onFlyToComplete();
            };
            map.on('moveend', onMoveEnd);
            map.flyTo(flyToTarget, 17, { animate: true, duration: 1.5 });
        }
    }, [flyToTarget, onFlyToComplete, map]);

    return null; 
};

const MapClickHandler: FC<{ onClick: (e: L.LeafletMouseEvent) => void }> = ({ onClick }) => {
    useMapEvents({
        click(e) {
            onClick(e);
        },
    });
    return null;
};


// --- MAP TAB COMPONENT ---
const MapTab: React.FC<{
    obras: Obra[];
    openLeadForm: (coords?: { lat: number, lng: number }, obra?: Obra) => void;
    routeToDraw: Obra[] | null;
    clearRoute: () => void;
    flyToTarget: [number, number] | null;
    onFlyToComplete: () => void;
    regions: Region[];
    onAddRegion: (region: Omit<Region, 'id'>) => void;
    onDeleteRegion: (id: string) => void;
    onNavigate: (obra: Obra) => void;
}> = ({ obras, openLeadForm, routeToDraw, clearRoute, flyToTarget, onFlyToComplete, regions, onAddRegion, onDeleteRegion, onNavigate }) => {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [filterEtapa, setFilterEtapa] = useState<EtapaLead | 'todos'>('todos');
  const [filterFase, setFilterFase] = useState<FaseObra | 'todos'>('todos');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<LatLngExpression[]>([]);
  const [showRegions, setShowRegions] = useState(true);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPosition([-19.9245, -43.9352]) // Fallback
    );
  }, []);

  const handleRecenter = useCallback(() => {
    if (map) {
        map.locate().on('locationfound', (e) => {
            const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
            setUserPosition(newPos);
            map.flyTo(newPos, 17);
        }).on('locationerror', () => {
            alert('Não foi possível obter sua localização. Verifique as permissões.');
        });
    }
  }, [map]);


  const handleSaveRegion = () => {
    if (currentDrawingPoints.length > 2) {
        const newRegion: Omit<Region, 'id'> = {
            points: currentDrawingPoints,
            color: REGION_COLORS[regions.length % REGION_COLORS.length],
        };
        onAddRegion(newRegion);
    }
    setCurrentDrawingPoints([]);
    setIsDrawing(false);
  };

  const handleCancelDrawing = () => {
    setCurrentDrawingPoints([]);
    setIsDrawing(false);
  };

   const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (isDrawing) {
        setCurrentDrawingPoints([...currentDrawingPoints, e.latlng]);
    } else {
        openLeadForm({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  };
  
  const filteredObras = useMemo(() => {
    return obras.filter(obra => {
        return (filterEtapa === 'todos' || obra.etapa === filterEtapa) &&
               (filterFase === 'todos' || obra.fase === filterFase);
    });
  }, [obras, filterEtapa, filterFase]);

  const getPinColor = (etapa: EtapaLead) => ETAPA_LEAD_OPTIONS.find(e => e.value === etapa)?.pinColor || 'blue';
  
  const customMarkerIcon = (color: string) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
      return L.divIcon({
          html: svg,
          className: 'custom-pin',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
      });
  };

  const routeLatLngs = useMemo(() => {
    return routeToDraw ? routeToDraw.map(obra => [obra.lat, obra.lng] as LatLngExpression) : [];
  }, [routeToDraw]);

  if (!userPosition) return <div className="flex justify-center items-center h-full">Carregando mapa...</div>;
  
  return (
    <div className="h-full w-full relative">
      {/* FIX: The 'center' prop was reported as not existing. While this is likely a type definition issue, the prop is essential for map initialization. No change made as the prop is correct per documentation. */}
      <MapContainer
        center={userPosition}
        zoom={13}
        className="h-full w-full z-0"
        ref={setMap}
      >
        {/* FIX: The 'attribution' prop was reported as not existing. This is the correct prop according to react-leaflet docs. No change made. */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapFlyToController flyToTarget={flyToTarget} onFlyToComplete={onFlyToComplete} />
        <MapClickHandler onClick={handleMapClick} />
        
        {userPosition && (
            // FIX: The 'radius' prop was reported as not existing. Moving it inside pathOptions to resolve the typing error.
            <CircleMarker center={userPosition} pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 1, radius: 8 }} />
        )}
        
        {filteredObras.map(obra => (
            // FIX: The 'icon' prop was reported as not existing. This is the correct prop for specifying a custom marker icon. No change made as the usage is correct.
            <Marker key={obra.id} position={[obra.lat, obra.lng]} icon={customMarkerIcon(getPinColor(obra.etapa))}>
                <Popup>
                    <div className="font-sans">
                        <h3 className="font-bold text-lg mb-1">{obra.nome}</h3>
                        <p className="text-sm text-gray-600">{obra.construtora}</p>
                        <p className="text-sm"><span className={`font-semibold ${ETAPA_LEAD_OPTIONS.find(o => o.value === obra.etapa)?.color}`}>{obra.etapa}</span></p>
                        <button onClick={() => openLeadForm(undefined, obra)} className="text-blue-500 hover:underline mt-2 text-sm">Ver Detalhes</button>
                        <button onClick={() => onNavigate(obra)} className="text-green-600 hover:underline mt-2 ml-2 text-sm">Navegar</button>
                    </div>
                </Popup>
            </Marker>
        ))}

        {showRegions && regions.map(region => (
            <Polygon key={region.id} positions={region.points} pathOptions={{ color: region.color, weight: 2 }}>
                <Popup>
                    <button onClick={() => onDeleteRegion(region.id)} className="text-red-500">Excluir Região</button>
                </Popup>
            </Polygon>
        ))}

        {isDrawing && currentDrawingPoints.length > 0 && (
            <Polygon positions={currentDrawingPoints} pathOptions={{ color: 'lime', dashArray: '5, 5' }} />
        )}

        {/* FIX: The 'color' prop is not a direct prop of Polyline. It should be passed inside the 'pathOptions' object. */}
        {routeToDraw && routeToDraw.length > 0 && <Polyline positions={routeLatLngs} pathOptions={{ color: "purple" }} />}

      </MapContainer>

      {/* Controls Overlay */}
      <div className="absolute top-2 left-2 z-10 bg-white p-2 rounded-md shadow-lg flex flex-col space-y-2">
         <select value={filterEtapa} onChange={e => setFilterEtapa(e.target.value as EtapaLead | 'todos')} className="p-1 border rounded">
            <option value="todos">Todas Etapas</option>
            {ETAPA_LEAD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
         </select>
         <select value={filterFase} onChange={e => setFilterFase(e.target.value as FaseObra | 'todos')} className="p-1 border rounded">
            <option value="todos">Todas Fases</option>
            {FASE_OBRA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
         </select>
         <button onClick={() => setShowRegions(!showRegions)} className="p-1 bg-gray-200 rounded">{showRegions ? 'Ocultar' : 'Mostrar'} Regiões</button>
      </div>
      
      <div className="absolute bottom-16 right-2 z-10 flex flex-col space-y-2">
            <button onClick={handleRecenter} className="bg-white p-2 rounded-full shadow-lg">
                <MyLocationIcon className="h-6 w-6 text-blue-600" />
            </button>
      </div>

       { isDrawing ? (
           <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
               <button onClick={handleSaveRegion} className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">Salvar Região</button>
               <button onClick={handleCancelDrawing} className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">Cancelar</button>
           </div>
       ) : (
           <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
              <button onClick={() => setIsDrawing(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">Desenhar Região</button>
               {routeToDraw && <button onClick={clearRoute} className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg">Limpar Rota</button>}
           </div>
       )}
    </div>
  );
};

const ListaTab: FC<{
    obras: Obra[],
    onEditObra: (obra: Obra) => void,
    onFlyTo: (coords: [number, number]) => void
}> = ({ obras, onEditObra, onFlyTo }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEtapa, setFilterEtapa] = useState<EtapaLead | 'todos'>('todos');
    const [filterFase, setFilterFase] = useState<FaseObra | 'todos'>('todos');

    const filteredObras = useMemo(() => {
        return obras.filter(obra => {
            const searchMatch = obra.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                obra.construtora.toLowerCase().includes(searchTerm.toLowerCase());
            const etapaMatch = filterEtapa === 'todos' || obra.etapa === filterEtapa;
            const faseMatch = filterFase === 'todos' || obra.fase === filterFase;
            return searchMatch && etapaMatch && faseMatch;
        });
    }, [obras, searchTerm, filterEtapa, filterFase]);

    const etapaCounts = useMemo(() => {
        return ETAPA_LEAD_OPTIONS.reduce((acc, etapa) => {
            acc[etapa.value] = filteredObras.filter(o => o.etapa === etapa.value).length;
            return acc;
        }, {} as Record<EtapaLead, number>);
    }, [filteredObras]);

    const totalNegociacao = useMemo(() => {
        return filteredObras
            .filter(o => o.etapa === EtapaLead.NEGOCIACAO)
            .reduce((sum, obra) => {
                const obraTotal = obra.propostas.reduce((propSum, prop) => propSum + prop.valor, 0);
                return sum + obraTotal;
            }, 0);
    }, [filteredObras]);

    const getEtapaColor = (etapa: EtapaLead) => ETAPA_LEAD_OPTIONS.find(e => e.value === etapa)?.color || 'bg-gray-200';

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 bg-white shadow-md z-10">
                <h2 className="text-2xl font-bold mb-4">Lista de Obras</h2>
                <input
                    type="text"
                    placeholder="Buscar por nome da obra ou construtora..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-md mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                    <select value={filterEtapa} onChange={e => setFilterEtapa(e.target.value as EtapaLead | 'todos')} className="p-2 border rounded-md">
                        <option value="todos">Todas Etapas</option>
                        {ETAPA_LEAD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <select value={filterFase} onChange={e => setFilterFase(e.target.value as FaseObra | 'todos')} className="p-2 border rounded-md">
                        <option value="todos">Todas Fases</option>
                        {FASE_OBRA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {ETAPA_LEAD_OPTIONS.map(etapa => (
                        <div key={etapa.value} className={`${etapa.color} text-white font-bold py-1 px-2 rounded-full`}>
                            {etapa.label}: {etapaCounts[etapa.value]}
                        </div>
                    ))}
                </div>
                {totalNegociacao > 0 &&
                    <div className="mt-2 text-sm font-semibold bg-yellow-100 text-yellow-800 p-2 rounded-md">
                        Valor em Negociação: {totalNegociacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                }
            </div>
            <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
                {filteredObras.length > 0 ? (
                    <ul className="space-y-3">
                        {filteredObras.map(obra => {
                            const contato = obra.contatos[0];
                            const proposta = obra.propostas[0];
                            const whatsappLink = contato ? `https://wa.me/${contato.telefone.replace(/\D/g, '')}`: '#';

                            return (
                                <li key={obra.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-lg text-gray-800">{obra.nome}</p>
                                            <p className="text-sm text-gray-600">{obra.construtora}</p>
                                        </div>
                                        <div className={`text-xs font-semibold px-2 py-1 rounded-full text-white ${getEtapaColor(obra.etapa)}`}>{obra.etapa}</div>
                                    </div>
                                    <div className="border-t my-3"></div>
                                    <div className="space-y-2 text-sm text-gray-700">
                                        <p><span className="font-semibold">Fase:</span> {obra.fase}</p>
                                        {contato && (
                                            <div className="flex items-center">
                                                <span className="font-semibold mr-2">Contato:</span>
                                                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                                                    {contato.nome} <PhoneIcon className="h-4 w-4 ml-1" />
                                                </a>
                                            </div>
                                        )}
                                        {proposta && (
                                            <p>
                                                <span className="font-semibold">Proposta:</span> {proposta.representada} - {proposta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-4 flex justify-end space-x-2">
                                        <button onClick={() => onEditObra(obra)} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors">
                                            <EditIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => onFlyTo([obra.lat, obra.lng])} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors">
                                            <MapIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        <p>Nenhuma obra encontrada.</p>
                        <p className="text-sm">Tente ajustar seus filtros.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const TarefasTab: FC<{ obras: Obra[], onRoteirizar: (obras: Obra[]) => void }> = ({ obras, onRoteirizar }) => {
    const [filter, setFilter] = useState<'dia' | 'futuras' | 'todas' | 'custom'>('dia');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

    const todasTarefas = useMemo(() => {
        return obras.flatMap(obra => 
            obra.tarefas.map(tarefa => ({
                ...tarefa,
                obraNome: obra.nome,
                construtora: obra.construtora,
            }))
        );
    }, [obras]);

    const filteredTarefas = useMemo(() => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        return todasTarefas.filter(tarefa => {
            const dataTarefa = new Date(tarefa.data);
            switch(filter) {
                case 'dia':
                    return dataTarefa.toDateString() === hoje.toDateString();
                case 'futuras':
                    return dataTarefa > hoje;
                case 'custom':
                    return new Date(tarefa.data).toISOString().split('T')[0] === customDate;
                case 'todas':
                default:
                    return true;
            }
        }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [todasTarefas, filter, customDate]);

    const handleRoteirizar = () => {
        const hoje = new Date().toDateString();
        const obrasParaVisitar = obras.filter(obra => 
            obra.tarefas.some(tarefa => 
                tarefa.tipo === TipoTarefa.VISITA && 
                new Date(tarefa.data).toDateString() === hoje
            )
        );
        onRoteirizar(obrasParaVisitar);
    };

    const getStatus = (data: string): { text: string, color: string } => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataTarefa = new Date(data);
        if (dataTarefa < hoje) {
            return { text: 'Atrasada', color: 'text-red-500' };
        }
        return { text: 'Em Dia', color: 'text-green-500' };
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 bg-white shadow-md z-10">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Tarefas</h2>
                    <button onClick={handleRoteirizar} className="flex items-center bg-purple-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">
                        <RouteIcon className="h-5 w-5 mr-2" />
                        Roteirizar Visitas
                    </button>
                </div>
                <div className="mt-4 flex space-x-2">
                    <button onClick={() => setFilter('dia')} className={`px-3 py-1 text-sm rounded-full ${filter === 'dia' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Do Dia</button>
                    <button onClick={() => setFilter('futuras')} className={`px-3 py-1 text-sm rounded-full ${filter === 'futuras' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Futuras</button>
                    <button onClick={() => setFilter('todas')} className={`px-3 py-1 text-sm rounded-full ${filter === 'todas' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Todas</button>
                    <input type="date" value={customDate} onChange={e => { setCustomDate(e.target.value); setFilter('custom'); }} className="p-1 border rounded-md text-sm" />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
                 {filteredTarefas.length > 0 ? (
                    <ul className="space-y-3">
                        {filteredTarefas.map(tarefa => {
                            const status = getStatus(tarefa.data);
                            return (
                                <li key={tarefa.id} className="bg-white border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-800">{tarefa.titulo}</p>
                                            <p className="text-sm text-gray-500">{tarefa.obraNome} - {tarefa.construtora}</p>
                                        </div>
                                        <div className={`text-xs font-bold ${status.color}`}>{status.text}</div>
                                    </div>
                                    <div className="mt-2 text-sm text-gray-700">
                                        <p>{tarefa.descricao}</p>
                                        <p className="mt-1"><span className="font-semibold">Data:</span> {new Date(tarefa.data).toLocaleDateString('pt-BR')} <span className="font-semibold ml-2">Tipo:</span> {tarefa.tipo}</p>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                 ) : (
                    <div className="text-center py-10 text-gray-500">
                        <p>Nenhuma tarefa encontrada para este filtro.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

const DashboardTab: FC<{ obras: Obra[], allMetas: Metas[] }> = ({ obras, allMetas }) => {
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthId());
    const [showPercentage, setShowPercentage] = useState(false);

    const { data, selectedMetas } = useMemo(() => {
        const metas = allMetas.find(m => m.id === selectedMonth) || createDefaultMetas(selectedMonth);

        const fechados = obras.filter(o => o.etapa === EtapaLead.FECHADO && o.dataCadastro.slice(0, 7) === selectedMonth);
        const tarefasConcluidasDoMes = obras.flatMap(o => o.tarefas).filter(t => t.status === 'Concluída' && new Date(t.data).toISOString().slice(0, 7) === selectedMonth);
        
        const valorFechado = fechados.reduce((sum, obra) => sum + obra.propostas.reduce((pSum, p) => pSum + p.valor, 0), 0);
        const visitasRealizadas = tarefasConcluidasDoMes.filter(t => t.tipo === TipoTarefa.VISITA).length;
        const ligacoesRealizadas = tarefasConcluidasDoMes.filter(t => t.tipo === TipoTarefa.LIGACAO).length;
        
        const obrasPorEtapa = ETAPA_LEAD_OPTIONS.map(etapa => ({
            name: etapa.label,
            value: obras.filter(o => o.etapa === etapa.value).length,
            fill: etapa.pinColor,
        }));

        const propostasPorRepresentada = Object.values(Representada).map(r => ({
            name: r,
            Quantidade: obras.flatMap(o => o.propostas).filter(p => p.representada === r).length,
        }));
        
        const valorPropostaPorRepresentada = Object.values(Representada).map(r => ({
            name: r,
            Valor: obras.flatMap(o => o.propostas).reduce((sum, p) => p.representada === r ? sum + p.valor : sum, 0),
        }));
        
        const valorFechadoPorRepresentada = Object.values(Representada).map(r => ({
            name: r,
            Valor: fechados.flatMap(o => o.propostas).reduce((sum, p) => p.representada === r ? sum + p.valor : sum, 0),
        }));

        return {
            data: {
                valorFechado,
                visitasRealizadas,
                ligacoesRealizadas,
                obrasPorEtapa,
                propostasPorRepresentada,
                valorPropostaPorRepresentada,
                valorFechadoPorRepresentada,
                valorFechadoPorRepresentadaData: valorFechadoPorRepresentada,
            },
            selectedMetas: metas,
        };
    }, [obras, allMetas, selectedMonth]);

    const getPercentage = (value: number, goal: number) => (goal > 0 ? (value / goal) * 100 : 0);
    
    const formatMonth = (monthId: string) => {
        const [year, month] = monthId.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const formatted = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };

    const renderMeta = (label: string, value: number, goal: number, colorClass = 'bg-green-500') => {
        const percentage = getPercentage(value, goal);
        return (
            <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-sm text-gray-600">{label}</p>
                {showPercentage ? (
                    <p className="text-2xl font-bold">{percentage.toFixed(1)}%</p>
                ) : (
                    <p className="text-xl font-bold">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}</p>
                )}
                <div className="w-full bg-gray-300 rounded-full h-2 mt-1">
                    <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                </div>
                <p className="text-xs text-right text-gray-500 mt-1">Meta: {goal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}</p>
            </div>
        );
    };

    const renderCountMeta = (label: string, value: number, goal: number) => {
        const percentage = getPercentage(value, goal);
        return (
            <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-sm text-gray-600">{label}</p>
                 {showPercentage ? (
                    <p className="text-2xl font-bold">{percentage.toFixed(1)}%</p>
                ) : (
                    <p className="text-2xl font-bold">{value}</p>
                )}
                <div className="w-full bg-gray-300 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                </div>
                <p className="text-xs text-right text-gray-500 mt-1">Meta: {goal}</p>
            </div>
        );
    }
    
    if (!allMetas) return <div className="p-4">Carregando dados do dashboard...</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 bg-white shadow-md z-10 space-y-4">
                 <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Dashboard</h2>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border rounded-md">
                        {allMetas.sort((a, b) => b.id.localeCompare(a.id)).map(meta => (
                             <option key={meta.id} value={meta.id}>{formatMonth(meta.id)}</option>
                        ))}
                    </select>
                </div>
                 <div className="flex justify-end items-center">
                    <span className="text-sm mr-2">Metas em %</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={showPercentage} onChange={() => setShowPercentage(!showPercentage)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4 bg-gray-50 space-y-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-2">Resultados de {formatMonth(selectedMonth)}</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-sm text-gray-500">Valor Fechado</p><p className="text-2xl font-bold">{data.valorFechado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                        <div><p className="text-sm text-gray-500">Visitas Realizadas</p><p className="text-2xl font-bold">{data.visitasRealizadas}</p></div>
                        <div><p className="text-sm text-gray-500">Ligações Realizadas</p><p className="text-2xl font-bold">{data.ligacoesRealizadas}</p></div>
                    </div>
                </div>

                 <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-2">Metas de {formatMonth(selectedMonth)}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {renderMeta("Vendas Totais", data.valorFechado, selectedMetas.vendasTotais)}
                        {renderCountMeta("Visitas", data.visitasRealizadas, selectedMetas.visitas)}
                        {renderCountMeta("Ligações", data.ligacoesRealizadas, selectedMetas.ligacoes)}
                    </div>
                    <h4 className="font-semibold text-md mb-2 mt-6 border-t pt-4">Metas por Representada</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.values(Representada).map(rep => {
                            const valorFechadoRep = data.valorFechadoPorRepresentadaData.find(d => d.name === rep)?.Valor || 0;
                            const metaRep = selectedMetas.porRepresentada[rep] || 0;
                            return renderMeta(rep, valorFechadoRep, metaRep, 'bg-purple-500');
                        })}
                    </div>
                 </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow h-80">
                         <h3 className="font-bold text-lg mb-2">Obras por Etapa (Geral)</h3>
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.obrasPorEtapa} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                     {data.obrasPorEtapa.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                     <div className="bg-white p-4 rounded-lg shadow h-80">
                         <h3 className="font-bold text-lg mb-2">Propostas por Representada (Geral)</h3>
                         <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={data.propostasPorRepresentada} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="Quantidade" fill="#8884d8" />
                            </BarChart>
                         </ResponsiveContainer>
                    </div>
                     <div className="bg-white p-4 rounded-lg shadow h-80">
                         <h3 className="font-bold text-lg mb-2">Valor em Proposta por Representada (Geral)</h3>
                         <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={data.valorPropostaPorRepresentada} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value as number)} />
                                <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)} />
                                <Bar dataKey="Valor" fill="#82ca9d" />
                            </BarChart>
                         </ResponsiveContainer>
                    </div>
                     <div className="bg-white p-4 rounded-lg shadow h-80">
                         <h3 className="font-bold text-lg mb-2">Valor Fechado por Representada ({formatMonth(selectedMonth)})</h3>
                         <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data.valorFechadoPorRepresentada} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value as number)} />
                                <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)} />
                                <Bar dataKey="Valor" fill="#ffc658" />
                            </BarChart>
                         </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PerfilTab: FC<{ 
    user: User, 
    metas: Metas | null,
    onLogout: () => void,
    onUpdateMetas: (newMetas: Omit<Metas, 'id'>) => Promise<void> 
}> = ({ user, metas, onLogout, onUpdateMetas }) => {
    const [isMetasModalOpen, setIsMetasModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    return (
        <div className="p-4 flex flex-col items-center bg-gray-50 h-full">
            <h2 className="text-2xl font-bold mb-4">Perfil</h2>
            <div className="bg-white p-6 rounded-lg shadow text-center w-full max-w-sm">
                <UserIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="font-semibold text-lg">{user.nomeCompleto}</p>
                <p className="text-gray-600">{user.email}</p>
            </div>
            <div className="mt-6 w-full max-w-sm space-y-3">
                <button onClick={() => setIsMetasModalOpen(true)} className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 font-semibold">
                    Editar Metas
                </button>
                 <button onClick={() => setIsPasswordModalOpen(true)} className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 font-semibold">
                    Trocar Senha
                </button>
                <button onClick={onLogout} className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 font-semibold">
                    Sair
                </button>
            </div>
            {isMetasModalOpen && metas && (
                <MetasModal 
                    isOpen={isMetasModalOpen}
                    onClose={() => setIsMetasModalOpen(false)}
                    currentMetas={metas}
                    onSave={onUpdateMetas}
                />
            )}
            {isPasswordModalOpen && (
                <ChangePasswordModal 
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                />
            )}
        </div>
    );
};

const MetasModal: FC<{
    isOpen: boolean,
    onClose: () => void,
    currentMetas: Metas,
    onSave: (newMetas: Omit<Metas, 'id'>) => Promise<void>
}> = ({ isOpen, onClose, currentMetas, onSave }) => {
    const [metas, setMetas] = useState(currentMetas);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        const { id, ...metasToSave } = metas;
        await onSave(metasToSave);
        setIsLoading(false);
        onClose();
    };
    
    const handleRepChange = (rep: Representada, value: number) => {
        setMetas(prev => ({
            ...prev,
            porRepresentada: {
                ...prev.porRepresentada,
                [rep]: value
            }
        }));
    };
    
    const formatMonth = (monthId: string) => {
        const [year, month] = monthId.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const formatted = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-full overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Editar Metas de {formatMonth(currentMetas.id)}</h3>
                <div className="space-y-4">
                    <h4 className="font-semibold text-md border-b pb-2">Metas Gerais</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm">Vendas Totais (R$)</label>
                            <input type="number" value={metas.vendasTotais} onChange={e => setMetas({...metas, vendasTotais: +e.target.value})} className="w-full p-2 border rounded"/>
                        </div>
                         <div>
                            <label className="text-sm">Nº de Visitas</label>
                            <input type="number" value={metas.visitas} onChange={e => setMetas({...metas, visitas: +e.target.value})} className="w-full p-2 border rounded"/>
                        </div>
                         <div>
                            <label className="text-sm">Nº de Ligações</label>
                            <input type="number" value={metas.ligacoes} onChange={e => setMetas({...metas, ligacoes: +e.target.value})} className="w-full p-2 border rounded"/>
                        </div>
                    </div>
                    <h4 className="font-semibold text-md border-b pb-2 pt-4">Metas por Representada (R$)</h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.values(Representada).map(rep => (
                            <div key={rep}>
                                <label className="text-sm">{rep}</label>
                                <input 
                                    type="number" 
                                    value={metas.porRepresentada[rep] || 0} 
                                    onChange={e => handleRepChange(rep, +e.target.value)} 
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                    <button onClick={handleSave} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400">
                        {isLoading ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    )
};

const ChangePasswordModal: FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async () => {
        setError('');
        setSuccess('');
        if (newPassword !== confirmPassword) {
            setError("As novas senhas não coincidem.");
            return;
        }
        if (!auth.currentUser) return;
        
        setIsLoading(true);
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email!, oldPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
            setSuccess("Senha alterada com sucesso!");
            setTimeout(onClose, 2000);
        } catch (error: any) {
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setError("A senha antiga está incorreta.");
            } else {
                 setError("Ocorreu um erro ao alterar a senha.");
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                <h3 className="text-xl font-bold mb-4">Alterar Senha</h3>
                <div className="space-y-3">
                    <input type="password" placeholder="Senha Antiga" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full p-2 border rounded"/>
                    <input type="password" placeholder="Nova Senha" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border rounded"/>
                    <input type="password" placeholder="Confirmar Nova Senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded"/>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                    <button onClick={handleChangePassword} disabled={isLoading || !!success} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400">
                        {isLoading ? 'Alterando...' : 'Alterar Senha'}
                    </button>
                </div>
            </div>
         </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [authPage, setAuthPage] = useState<'login' | 'signup' | 'forgot'>('login');
    const [activeTab, setActiveTab] = useState<'map' | 'list' | 'tasks'| 'dashboard' | 'profile'>('map');

    const [obras, setObras] = useState<Obra[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [allMetas, setAllMetas] = useState<Metas[]>([]);
    const [currentMonthMetas, setCurrentMonthMetas] = useState<Metas | null>(null);
    
    const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null);
    const [routeToDraw, setRouteToDraw] = useState<Obra[] | null>(null);
    
    // UI State
    const [isObraModalOpen, setIsObraModalOpen] = useState(false);
    const [selectedObra, setSelectedObra] = useState<Partial<Obra> | null>(null);

    const handleMockLogin = useCallback((loggedInUser: User) => {
        setIsLoadingData(true);
        setUser(loggedInUser);
        setObras(MOCK_OBRAS);
        setAllMetas([MOCK_METAS]);
        setCurrentMonthMetas(MOCK_METAS);
        setRegions([]);
        setIsLoadingData(false);
    }, []);

    const fetchData = useCallback(async (userId: string) => {
        if (!isFirebaseConfigured || !db) {
            console.error("Firestore is not initialized.");
            setIsLoadingData(false);
            return;
        }
        setIsLoadingData(true);
        try {
            const monthId = getCurrentMonthId();
            // Fetch Obras
            const obrasQuery = query(collection(db, `users/${userId}/obras`));
            const obrasSnapshot = await getDocs(obrasQuery);
            const obrasData = obrasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            
            // Fetch Regions
            const regionsQuery = query(collection(db, `users/${userId}/regions`));
            const regionsSnapshot = await getDocs(regionsQuery);
            const regionsData = regionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region));
            setRegions(regionsData);

            // Fetch Metas
            const metasQuery = query(collection(db, `users/${userId}/metas`));
            const metasSnapshot = await getDocs(metasQuery);
            const metasData = metasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Metas));
            
            if (metasData.length === 0) {
                 const defaultMetas = createDefaultMetas(monthId);
                 await setDoc(doc(db, `users/${userId}/metas`, monthId), defaultMetas);
                 setAllMetas([defaultMetas]);
                 setCurrentMonthMetas(defaultMetas);
            } else {
                 setAllMetas(metasData);
                 const currentMetas = metasData.find(m => m.id === monthId) || createDefaultMetas(monthId);
                 setCurrentMonthMetas(currentMetas);
            }

            // Check for inactive obras
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const batch = writeBatch(db);
            let hasChanges = false;
            
            const updatedObras = obrasData.map(obra => {
                const lastUpdatedDate = new Date(obra.lastUpdated);
                const isInactive = lastUpdatedDate < ninetyDaysAgo;
                const canBecomeInactive = ![EtapaLead.FECHADO, EtapaLead.PERDIDO, EtapaLead.INATIVO].includes(obra.etapa);
                
                if (isInactive && canBecomeInactive) {
                    hasChanges = true;
                    const updatedObra = {
                        ...obra,
                        etapa: EtapaLead.INATIVO,
                        lastUpdated: new Date().toISOString(),
                        tarefas: [
                            ...obra.tarefas,
                            {
                                id: `task_${Date.now()}`,
                                obraId: obra.id,
                                titulo: 'Verificar obra inativa',
                                tipo: TipoTarefa.LIGACAO,
                                data: new Date().toISOString(),
                                descricao: 'Obra marcada como inativa por falta de atividade. Entrar em contato para reativar.',
                                status: 'Pendente'
                            } as Tarefa
                        ]
                    };
                    const obraRef = doc(db, `users/${userId}/obras`, obra.id);
                    batch.update(obraRef, { 
                        etapa: updatedObra.etapa, 
                        lastUpdated: updatedObra.lastUpdated,
                        tarefas: updatedObra.tarefas
                    });
                    return updatedObra;
                }
                return obra;
            });
            
            if (hasChanges) {
                await batch.commit();
                setObras(updatedObras);
                alert("Algumas obras foram marcadas como inativas por falta de atividade e tarefas foram criadas.");
            } else {
                setObras(obrasData);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (!isFirebaseConfigured) {
            setIsLoadingAuth(false);
            return;
        }

        if (!auth || !db) {
            setIsLoadingAuth(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser && firebaseUser.emailVerified) {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                
                let userProfileData: User;

                if (!userDocSnap.exists()) {
                    console.log(`Primeiro login para ${firebaseUser.uid}, criando perfil no Firestore.`);
                    const newUserProfile: User = {
                        id: firebaseUser.uid,
                        nomeCompleto: firebaseUser.displayName || 'Usuário',
                        email: firebaseUser.email || '',
                    };

                    try {
                        await setDoc(userDocRef, newUserProfile);
                        userProfileData = newUserProfile;
                    } catch (error) {
                        console.error("CRÍTICO: Falha ao criar o perfil do usuário no primeiro login.", error);
                        alert("Não foi possível configurar seu perfil no banco de dados. Verifique as regras de segurança do Firestore e tente fazer login novamente.");
                        await signOut(auth);
                        setIsLoadingAuth(false);
                        return;
                    }
                } else {
                    userProfileData = userDocSnap.data() as User;
                }

                setUser(userProfileData);
                await fetchData(firebaseUser.uid);
            } else {
                setUser(null);
                setObras([]);
                setRegions([]);
                setCurrentMonthMetas(null);
                setAllMetas([]);
            }
            setIsLoadingAuth(false);
        });
        return () => unsubscribe();
    }, [fetchData]);

    const handleLogout = async () => {
        if (!isFirebaseConfigured) {
            setUser(null);
            return;
        }
        if (!auth) return;
        await signOut(auth);
    };

    const handleFlyTo = (coords: [number, number]) => {
        setActiveTab('map');
        setFlyToTarget(coords);
    };
    
    const openLeadForm = (coords?: { lat: number; lng: number }, obra?: Obra) => {
        if (obra) {
            setSelectedObra(obra);
        } else if (coords) {
            setSelectedObra({ 
                lat: coords.lat, 
                lng: coords.lng,
                dataCadastro: new Date().toISOString().split('T')[0],
                etapa: EtapaLead.LEAD,
                contatos: [],
                tarefas: [],
                propostas: [],
                fotos: [],
            });
        }
        setIsObraModalOpen(true);
    };

    const clearRoute = () => setRouteToDraw(null);
    const onFlyToComplete = () => setFlyToTarget(null);
    const navigate = (obra: Obra) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${obra.lat},${obra.lng}`;
        window.open(url, '_blank');
    };
    
    const saveRegion = async (regionData: Omit<Region, 'id'>) => {
        if (!isFirebaseConfigured) {
            const newRegion = { ...regionData, id: `mock_region_${Date.now()}` };
            setRegions(prev => [...prev, newRegion]);
            return;
        }

        if (!user || !db) return;
        try {
            const regionCollRef = collection(db, `users/${user.id}/regions`);
            const newDocRef = await addDoc(regionCollRef, regionData);
            setRegions([...regions, { ...regionData, id: newDocRef.id }]);
        } catch (e) {
            console.error("Error adding region:", e);
        }
    };
    
    const deleteRegion = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta região?')) return;
        
        if (!isFirebaseConfigured) {
            setRegions(prev => prev.filter(r => r.id !== id));
            return;
        }
        
        if (!user || !db) return;
        try {
            const regionDocRef = doc(db, `users/${user.id}/regions`, id);
            await deleteDoc(regionDocRef);
            setRegions(regions.filter(r => r.id !== id));
        } catch (e) {
            console.error("Error deleting region:", e);
        }
    };

    const editObra = (obra: Obra) => openLeadForm(undefined, obra);

    const updateMetas = async (newMetasData: Omit<Metas, 'id'>) => {
        const monthId = getCurrentMonthId();
        const newMetas: Metas = { id: monthId, ...newMetasData };

        if (!isFirebaseConfigured) {
            setCurrentMonthMetas(newMetas);
            setAllMetas(prev => prev.map(m => m.id === monthId ? newMetas : m));
            alert("Metas atualizadas (modo demonstração).");
            return;
        }

        if (!user || !db) return;
        try {
            const metasDocRef = doc(db, `users/${user.id}/metas`, monthId);
            await setDoc(metasDocRef, newMetasData); // Save without id in the document body
            setCurrentMonthMetas(newMetas);
            setAllMetas(prev => {
                const existing = prev.find(m => m.id === monthId);
                if (existing) {
                    return prev.map(m => m.id === monthId ? newMetas : m);
                }
                return [...prev, newMetas];
            });
            alert("Metas atualizadas com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar metas:", error);
            alert("Não foi possível atualizar as metas.");
        }
    };
    
    const handleRoteirizar = (obrasParaVisitar: Obra[]) => {
        if(obrasParaVisitar.length > 0) {
            setRouteToDraw(obrasParaVisitar);
            setActiveTab('map');
            handleFlyTo([obrasParaVisitar[0].lat, obrasParaVisitar[0].lng]);
        } else {
            alert("Nenhuma tarefa de visita para hoje!");
        }
    }

    const LoadingOverlay = () => (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
    );


    if (isLoadingAuth) {
        return <div className="min-h-screen flex items-center justify-center"><LoadingOverlay/></div>;
    }

    if (!user) {
        return <AuthManager page={authPage} setPage={setAuthPage} onMockLogin={handleMockLogin} />;
    }
    
    if (isLoadingData) {
        return <div className="min-h-screen flex items-center justify-center"><LoadingOverlay/></div>;
    }

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'map':
                return <MapTab 
                            obras={obras}
                            openLeadForm={openLeadForm}
                            routeToDraw={routeToDraw}
                            clearRoute={clearRoute}
                            flyToTarget={flyToTarget}
                            onFlyToComplete={onFlyToComplete}
                            regions={regions}
                            onAddRegion={saveRegion}
                            onDeleteRegion={deleteRegion}
                            onNavigate={navigate}
                         />;
            case 'list':
                return <ListaTab obras={obras} onEditObra={editObra} onFlyTo={handleFlyTo} />;
            case 'tasks':
                return <TarefasTab obras={obras} onRoteirizar={handleRoteirizar} />;
            case 'dashboard':
                return <DashboardTab obras={obras} allMetas={allMetas} />;
            case 'profile':
                return <PerfilTab user={user} metas={currentMonthMetas} onLogout={handleLogout} onUpdateMetas={updateMetas} />;
            default:
                return null;
        }
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-gray-100">
            <main className="flex-grow h-full overflow-hidden">
                {renderActiveTab()}
            </main>
            {/* Bottom Navigation */}
            <nav className="w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 shadow-inner z-20">
                <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center justify-center p-2 rounded-lg w-1/5 ${activeTab === 'map' ? 'text-blue-600' : 'text-gray-500'}`}>
                    <MapIcon className="h-6 w-6" />
                    <span className="text-xs">Mapa</span>
                </button>
                 <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center justify-center p-2 rounded-lg w-1/5 ${activeTab === 'list' ? 'text-blue-600' : 'text-gray-500'}`}>
                    <ListIcon className="h-6 w-6" />
                    <span className="text-xs">Lista</span>
                </button>
                 <button onClick={() => setActiveTab('tasks')} className={`flex flex-col items-center justify-center p-2 rounded-lg w-1/5 ${activeTab === 'tasks' ? 'text-blue-600' : 'text-gray-500'}`}>
                    <CheckSquareIcon className="h-6 w-6" />
                    <span className="text-xs">Tarefas</span>
                </button>
                 <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center justify-center p-2 rounded-lg w-1/5 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-500'}`}>
                    <BarChartIcon className="h-6 w-6" />
                    <span className="text-xs">Dashboard</span>
                </button>
                 <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center p-2 rounded-lg w-1/5 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'}`}>
                    <UserIcon className="h-6 w-6" />
                    <span className="text-xs">Perfil</span>
                </button>
            </nav>
        </div>
    );
}



import React, { useState, useEffect, useMemo, FC, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, Polygon, CircleMarker } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import * as Recharts from 'recharts';
import { auth, db, storage } from './firebase';
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
import { ETAPA_LEAD_OPTIONS, FASE_OBRA_OPTIONS, REPRESENTADA_PRODUTOS_MAP } from './constants';
import {
  ListIcon, MapIcon, CheckSquareIcon, BarChartIcon, UserIcon, EyeIcon, EyeOffIcon, XIcon, PlusIcon, PhoneIcon, MailIcon, BriefcaseIcon, EditIcon, TrashIcon, PlusCircleIcon, RouteIcon, NavigationIcon, MyLocationIcon, DownloadIcon, UploadIcon
} from './components/Icons';


// --- HELPERS ---
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
    // Firestore permission error, common during signup
    case 'permission-denied':
        return 'Permissão negada. Verifique as regras de segurança do seu banco de dados (Firestore).';
    default:
      console.error("Firebase Error:", errorCode); // Log the actual error for debugging
      return 'Ocorreu um erro. Por favor, tente novamente.';
  }
};


// --- AUTH COMPONENTS ---
const AuthLayout: FC<{ title: string, subtitle: string, children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
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

const LoginPage: FC<{ setPage: (page: 'login' | 'signup' | 'forgot') => void; }> = ({ setPage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState<FirebaseUser | null>(null);

  const handleLogin = async () => {
    if (!auth) return;
    setError('');
    setSuccess('');
    setIsLoading(true);
    setNeedsVerification(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        setNeedsVerification(userCredential.user);
        setError("Seu e-mail ainda não foi verificado. Por favor, verifique sua caixa de entrada.");
        await signOut(auth);
      }
      // onLoginSuccess will be handled by onAuthStateChanged listener
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

const SignupPage: FC<{ setPage: (page: 'login' | 'signup' | 'forgot') => void; }> = ({ setPage }) => {
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
        if (!auth) return;
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
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            // Salva o nome do usuário no perfil de autenticação.
            // O perfil do banco de dados será criado no primeiro login bem-sucedido.
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
}> = ({ page, setPage }) => {
  if (page === 'signup') {
    return <SignupPage setPage={setPage} />;
  }
  if (page === 'forgot') {
    return <ForgotPasswordPage setPage={setPage} />;
  }
  return <LoginPage setPage={setPage} />;
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

const MapClickHandler: FC<{ isDrawing: boolean; onClick: (e: L.LeafletMouseEvent) => void }> = ({ isDrawing, onClick }) => {
    useMapEvents({
        click(e) {
            if (isDrawing) {
                onClick(e);
            }
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
      <MapContainer
        center={userPosition}
        zoom={13}
        className="h-full w-full z-0"
        ref={setMap}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapFlyToController flyToTarget={flyToTarget} onFlyToComplete={onFlyToComplete} />
        <MapClickHandler isDrawing={isDrawing} onClick={handleMapClick} />
        
        {userPosition && (
            <CircleMarker center={userPosition} radius={8} pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 1 }} />
        )}
        
        {filteredObras.map(obra => (
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

        {routeToDraw && routeToDraw.length > 0 && <Polyline positions={routeLatLngs} color="purple" />}

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

// Placeholder stubs for other tabs. In a real app, these would be in separate files.
const ListaTab: FC<{ 
    obras: Obra[], 
    onEditObra: (obra: Obra) => void, 
    onFlyTo: (coords: [number, number]) => void 
}> = ({ obras, onEditObra, onFlyTo }) => (
    <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Lista de Obras</h2>
        <ul className="space-y-2">
            {obras.map((obra) => (
                <li key={obra.id} className="border p-3 rounded-lg shadow-sm flex justify-between items-center">
                    <div>
                        <p className="font-semibold">{obra.nome}</p>
                        <p className="text-sm text-gray-500">{obra.construtora}</p>
                    </div>
                    <div className="space-x-2">
                        <button onClick={() => onEditObra(obra)} className="p-2 bg-blue-100 text-blue-600 rounded-full"><EditIcon className="h-5 w-5"/></button>
                        <button onClick={() => onFlyTo([obra.lat, obra.lng])} className="p-2 bg-green-100 text-green-600 rounded-full"><MapIcon className="h-5 w-5"/></button>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

const MetasTab: FC<{ metas: Metas | null, onUpdateMetas: (newMetas: Metas) => void }> = ({ metas, onUpdateMetas }) => (
    <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Metas</h2>
        {metas ? (
            <div className="bg-white p-4 rounded-lg shadow">
                <p>Vendas Totais: R$ {metas.vendasTotais.toFixed(2)}</p>
                <p>Visitas: {metas.visitas}</p>
                <p>Ligações: {metas.ligacoes}</p>
            </div>
        ) : <p>Carregando metas...</p>}
    </div>
);

const PerfilTab: FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => (
    <div className="p-4 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-4">Perfil</h2>
        <div className="bg-white p-6 rounded-lg shadow text-center">
            <UserIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="font-semibold text-lg">{user.nomeCompleto}</p>
            <p className="text-gray-600">{user.email}</p>
        </div>
        <button onClick={onLogout} className="mt-8 bg-red-500 text-white py-2 px-6 rounded-md hover:bg-red-600 font-semibold">
            Sair
        </button>
    </div>
);

// --- MAIN APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [authPage, setAuthPage] = useState<'login' | 'signup' | 'forgot'>('login');
    const [activeTab, setActiveTab] = useState<'map' | 'list' | 'tasks'| 'dashboard' | 'profile'>('map');

    const [obras, setObras] = useState<Obra[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [metas, setMetas] = useState<Metas | null>(null);
    const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null);
    const [routeToDraw, setRouteToDraw] = useState<Obra[] | null>(null);
    
    // UI State
    const [isObraModalOpen, setIsObraModalOpen] = useState(false);
    const [selectedObra, setSelectedObra] = useState<Partial<Obra> | null>(null);


    const fetchData = useCallback(async (userId: string) => {
        if (!db) {
            console.error("Firestore is not initialized.");
            setIsLoadingData(false);
            return;
        }
        setIsLoadingData(true);
        try {
            // Fetch Obras
            const obrasQuery = query(collection(db, `users/${userId}/obras`));
            const obrasSnapshot = await getDocs(obrasQuery);
            const obrasData = obrasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasData);

            // Fetch Regions
            const regionsQuery = query(collection(db, `users/${userId}/regions`));
            const regionsSnapshot = await getDocs(regionsQuery);
            const regionsData = regionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region));
            setRegions(regionsData);

            // Fetch Metas
            const metasDocRef = doc(db, `users/${userId}/data/metas`);
            const metasDoc = await getDoc(metasDocRef);
            if (metasDoc.exists()) {
                setMetas(metasDoc.data() as Metas);
            } else {
                 setMetas({ vendasTotais: 0, visitas: 0, ligacoes: 0, porRepresentada: {} as Record<Representada, number> });
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            // Optionally, set an error state to show in the UI
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
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
                    // Primeiro login de um usuário verificado, crie seu perfil no Firestore.
                    console.log(`Primeiro login para ${firebaseUser.uid}, criando perfil no Firestore.`);
                    const newUserProfile: User = {
                        id: firebaseUser.uid,
                        nomeCompleto: firebaseUser.displayName || 'Usuário',
                        email: firebaseUser.email || '',
                    };

                    try {
                        const batch = writeBatch(db);
                        
                        // Define o documento do perfil do usuário
                        batch.set(userDocRef, newUserProfile);

                        // Define o documento inicial de metas
                        const metasDocRef = doc(db, `users/${firebaseUser.uid}/data/metas`);
                        batch.set(metasDocRef, {
                            vendasTotais: 0,
                            visitas: 0,
                            ligacoes: 0,
                            porRepresentada: {},
                        } as Metas);
                        
                        await batch.commit();
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
                setMetas(null);
            }
            setIsLoadingAuth(false);
        });
        return () => unsubscribe();
    }, [fetchData]);

    const handleLogout = async () => {
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
        if (!user || !db || !confirm('Tem certeza que deseja excluir esta região?')) return;
        try {
            const regionDocRef = doc(db, `users/${user.id}/regions`, id);
            await deleteDoc(regionDocRef);
            setRegions(regions.filter(r => r.id !== id));
        } catch (e) {
            console.error("Error deleting region:", e);
        }
    };

    const editObra = (obra: Obra) => openLeadForm(undefined, obra);

    const updateMetas = async (newMetas: Metas) => {
        if (!user || !db) return;
        try {
            const metasDocRef = doc(db, `users/${user.id}/data/metas`);
            await setDoc(metasDocRef, newMetas);
            setMetas(newMetas);
            alert("Metas atualizadas com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar metas:", error);
            alert("Não foi possível atualizar as metas.");
        }
    };

    const LoadingOverlay = () => (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
    );


    if (isLoadingAuth) {
        return <div className="min-h-screen flex items-center justify-center"><LoadingOverlay/></div>;
    }

    if (!user) {
        return <AuthManager page={authPage} setPage={setAuthPage} />;
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
                 // This tab will be fully implemented in a future step.
                return <ListaTab obras={obras} onEditObra={editObra} onFlyTo={handleFlyTo} />;
            case 'tasks':
                 // This tab will be fully implemented in a future step.
                return <div className="p-4">Tarefas em breve...</div>;
            case 'dashboard':
                 // This tab will be fully implemented in a future step.
                return <div className="p-4">Dashboard em breve...</div>;
            case 'profile':
                return <PerfilTab user={user} onLogout={handleLogout} />;
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

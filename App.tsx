
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
  EmailAuthProvider
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
    query
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
const { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } = Recharts;

import { Obra, EtapaLead, User, Tarefa, TipoTarefa, Contato, FaseObra, Proposta, Representada, Metas, Region } from './types';
import { ETAPA_LEAD_OPTIONS, FASE_OBRA_OPTIONS, REPRESENTADA_PRODUTOS_MAP } from './constants';
import {
  ListIcon, MapIcon, CheckSquareIcon, BarChartIcon, UserIcon, EyeIcon, EyeOffIcon, XIcon, PlusIcon, PhoneIcon, MailIcon, BriefcaseIcon, EditIcon, TrashIcon, PlusCircleIcon, RouteIcon, NavigationIcon, MyLocationIcon
} from './components/Icons';


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
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        setError("Por favor, verifique seu e-mail antes de fazer login.");
        await signOut(auth);
      }
      // onLoginSuccess will be handled by onAuthStateChanged listener
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          setError('E-mail ou senha inválidos.');
      } else {
          setError('Ocorreu um erro ao fazer login.');
      }
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
            await updateProfile(userCredential.user, { displayName: nomeCompleto });
            
            // Create user document in Firestore
            const userDocRef = doc(db, "users", userCredential.user.uid);
            await setDoc(userDocRef, {
                id: userCredential.user.uid,
                nomeCompleto: nomeCompleto,
                email: email,
            });

            await sendEmailVerification(userCredential.user);
            
            setSuccess('Cadastro realizado! Um e-mail de verificação foi enviado. Por favor, verifique sua caixa de entrada antes de fazer login.');
            
            setTimeout(() => setPage('login'), 5000);

        } catch (err: any) {
             if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está em uso.');
            } else {
                setError("Falha ao realizar o cadastro. Tente novamente.");
            }
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

// ... (Rest of the components: MapTab, ListaTab, etc. will go here)

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


// --- MAP TAB COMPONENT ---
const MapTab: React.FC<{
    obras: Obra[];
    openLeadForm: (coords?: { lat: number, lng: number }, obra?: Obra) => void;
    routeToDraw: Obra[] | null;
    clearRoute: () => void;
    flyToTarget: [number, number] | null;
    onFlyToComplete: () => void;
    regions: Region[];
    onAddRegion: (region: Region) => void;
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
        const newRegion: Omit<Region, 'id'> & { id?: string } = {
            points: currentDrawingPoints,
            color: REGION_COLORS[regions.length % REGION_COLORS.length],
        };
        onAddRegion(newRegion as Region);
    }
    setCurrentDrawingPoints([]);
    setIsDrawing(false);
  };

  const handleCancelDrawing = () => {
    setCurrentDrawingPoints([]);
    setIsDrawing(false);
  };
  
  const filteredObras = useMemo(() => {
    return obras.filter(obra => {
        return (filterEtapa === 'todos' || obra.etapa === filterEtapa) &&
               (filterFase === 'todos' || obra.fase === filterFase);
    });
  }, [obras, filterEtapa, filterFase]);

  const getPinColor = (etapa: EtapaLead) => ETAPA_LEAD_OPTIONS.find(e => e.value === etapa)?.pinColor || 'blue';
  
  const customMarkerIcon = (color: string) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>`;
      return L.divIcon({ html: svg, className: '', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36] });
  };
  
  const userLocationIcon = L.divIcon({
    html: `<div class="user-location-marker"></div>`,
    className: '',
    iconSize: [18, 18],
  });
  
  const routeCoordinates = useMemo(() => {
    return routeToDraw ? routeToDraw.map(o => [o.lat, o.lng] as [number, number]) : [];
  }, [routeToDraw]);

  if (!userPosition) return <div className="flex justify-center items-center h-full">Carregando mapa...</div>;

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-4 left-4 right-4 z-[1000] bg-white p-2 rounded-lg shadow-md space-y-2">
        {!isDrawing ? (
          <>
            <div className="grid grid-cols-2 gap-2">
                <select value={filterEtapa} onChange={e => setFilterEtapa(e.target.value as any)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
                    <option value="todos">Todas Etapas</option>
                    {ETAPA_LEAD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                 <select value={filterFase} onChange={e => setFilterFase(e.target.value as any)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
                    <option value="todos">Todas Fases</option>
                    {FASE_OBRA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>
            <div className="flex items-center justify-between gap-2">
                <button onClick={() => setIsDrawing(true)} className="flex-1 text-sm bg-green-500 text-white px-3 py-1.5 rounded-md font-semibold">Desenhar Região</button>
                <button onClick={() => setShowRegions(s => !s)} className="flex-1 text-sm bg-purple-500 text-white px-3 py-1.5 rounded-md font-semibold">{showRegions ? 'Ocultar' : 'Mostrar'} Regiões</button>
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm text-center text-gray-700 font-medium mb-2">Clique no mapa para adicionar pontos à região.</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={handleSaveRegion} className="flex-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md font-semibold">Salvar</button>
              <button onClick={handleCancelDrawing} className="flex-1 text-sm bg-gray-500 text-white px-3 py-1.5 rounded-md font-semibold">Cancelar</button>
            </div>
          </div>
        )}
      </div>
      <MapContainer center={userPosition as LatLngExpression} zoom={13} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents onMapClick={(latlng) => openLeadForm(latlng)} isDrawing={isDrawing} onDrawClick={(latlng) => setCurrentDrawingPoints(p => [...p, [latlng.lat, latlng.lng]])} setMap={setMap} />
        <MapFlyToController flyToTarget={flyToTarget} onFlyToComplete={onFlyToComplete} />
        
        {filteredObras.map(obra => (
          <Marker key={obra.id} position={[obra.lat, obra.lng]} icon={customMarkerIcon(getPinColor(obra.etapa))}>
            <Popup>
              <div className="text-sm space-y-2">
                <div>
                    <b className="font-bold">{obra.nome}</b><br />{obra.construtora}<br />
                    <span className={`px-1.5 py-0.5 text-xs font-semibold text-white rounded-full ${ETAPA_LEAD_OPTIONS.find(e => e.value === obra.etapa)?.color}`}>{obra.etapa}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <button onClick={(e) => { e.stopPropagation(); openLeadForm(undefined, obra); }} className="text-blue-600 text-xs font-semibold">Ver Detalhes</button>
                    <button onClick={(e) => { e.stopPropagation(); onNavigate(obra); }} className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                        <NavigationIcon className="w-4 h-4" />
                        Navegar
                    </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {userPosition && <Marker position={userPosition} icon={userLocationIcon}></Marker>}
        {routeToDraw && <Polyline pathOptions={{ color: 'blue', weight: 5 }} positions={routeCoordinates} />}
        {showRegions && regions.map((region) => (
          <Polygon key={region.id} positions={region.points} pathOptions={{ color: region.color, fillOpacity: 0.2 }}>
            <Popup>
              <div className="text-center p-1">
                <p className="font-semibold mb-2 text-sm">Região</p>
                <button onClick={() => onDeleteRegion(region.id)} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md font-semibold flex items-center gap-1">
                  <TrashIcon className="w-3 h-3"/> Deletar
                </button>
              </div>
            </Popup>
          </Polygon>
        ))}
        {isDrawing && currentDrawingPoints.length > 0 && <Polyline positions={currentDrawingPoints} pathOptions={{ color: 'orange', dashArray: '5, 5' }} />}
        {isDrawing && currentDrawingPoints.map((point, i) => <CircleMarker key={`point-${i}`} center={point} radius={5} pathOptions={{ color: 'orange', fillOpacity: 0.8 }} />)}
      </MapContainer>
      <button 
        onClick={handleRecenter}
        className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-full shadow-lg text-gray-800 hover:bg-gray-100 transition"
        aria-label="Recentralizar no mapa"
        title="Recentralizar no mapa"
      >
        <MyLocationIcon className="w-6 h-6" />
      </button>
      {routeToDraw && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
          <button onClick={clearRoute}>Limpar Rota</button>
        </div>
      )}
    </div>
  );
};
const MapEvents: React.FC<{ 
    onMapClick: (latlng: { lat: number, lng: number }) => void,
    isDrawing: boolean;
    onDrawClick: (latlng: { lat: number, lng: number }) => void;
    setMap: (map: L.Map) => void;
}> = ({ onMapClick, isDrawing, onDrawClick, setMap }) => {
  const map = useMapEvents({
    click(e) {
      if (isDrawing) {
        onDrawClick(e.latlng);
      } else {
        onMapClick(e.latlng);
      }
    },
  });

  useEffect(() => {
    setMap(map);
  }, [map, setMap]);

  return null;
};
const REGION_COLORS = ['#3388ff', '#e54848', '#42b057', '#e5dd48', '#a448e5', '#e58f48'];


// --- LISTA TAB ---
const ListaTab: FC<{ 
    obras: Obra[]; 
    onEdit: (obra: Obra) => void; 
    onViewOnMap: (obra: Obra) => void;
    onNavigate: (obra: Obra) => void;
}> = ({ obras, onEdit, onViewOnMap, onNavigate }) => {
    const [filterEtapa, setFilterEtapa] = useState<EtapaLead | 'todos'>('todos');
    const [filterFase, setFilterFase] = useState<FaseObra | 'todos'>('todos');
    const [filterNome, setFilterNome] = useState('');

    const filteredObras = useMemo(() => {
        return obras.filter(obra => {
            return (filterEtapa === 'todos' || obra.etapa === filterEtapa) &&
                   (filterFase === 'todos' || obra.fase === filterFase) &&
                   (obra.nome.toLowerCase().includes(filterNome.toLowerCase()) || 
                    obra.construtora.toLowerCase().includes(filterNome.toLowerCase()));
        });
    }, [obras, filterEtapa, filterFase, filterNome]);
    
    const counters = useMemo(() => {
        return ETAPA_LEAD_OPTIONS.map(etapa => ({
            ...etapa,
            count: filteredObras.filter(o => o.etapa === etapa.value).length
        }));
    }, [filteredObras]);
    
    const negotiationValue = useMemo(() => {
        return filteredObras
            .filter(o => o.etapa === EtapaLead.NEGOCIACAO)
            .reduce((sum, o) => sum + o.propostas.reduce((s, p) => s + p.valor, 0), 0);
    }, [filteredObras]);

    return (
        <div className="p-4 space-y-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
                <input 
                    type="text" 
                    placeholder="Buscar por nome da obra ou construtora..."
                    value={filterNome}
                    onChange={(e) => setFilterNome(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <select value={filterEtapa} onChange={e => setFilterEtapa(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                        <option value="todos">Todas Etapas</option>
                        {ETAPA_LEAD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                     <select value={filterFase} onChange={e => setFilterFase(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                        <option value="todos">Todas Fases</option>
                        {FASE_OBRA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-center">
                {counters.map(c => (
                    <div key={c.value} className="p-2 bg-white rounded-lg shadow-sm">
                        <p className={`font-bold text-lg ${c.color.replace('bg', 'text')}`}>{c.count}</p>
                        <p className="text-xs text-gray-600">{c.label}</p>
                    </div>
                ))}
            </div>
            
             <div className="p-3 bg-yellow-100 border-l-4 border-yellow-500 rounded-r-lg">
                <p className="text-sm font-semibold text-yellow-800">Valor em Negociação</p>
                <p className="text-xl font-bold text-yellow-900">{negotiationValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>

            <div className="space-y-3">
                {filteredObras.map(obra => (
                    <div key={obra.id} onClick={() => onEdit(obra)} className="bg-white p-4 rounded-lg shadow-sm space-y-2 cursor-pointer transition-all hover:shadow-md">
                        {obra.fotos && obra.fotos[0] && (
                            <img src={obra.fotos[0]} alt={obra.nome} className="w-full h-32 object-cover rounded-md mb-2" />
                        )}
                        <div className="flex justify-between items-start">
                           <div>
                             <h3 className="font-bold text-lg">{obra.nome}</h3>
                             <p className="text-sm text-gray-600">{obra.construtora}</p>
                           </div>
                            <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${ETAPA_LEAD_OPTIONS.find(e => e.value === obra.etapa)?.color}`}>{obra.etapa}</span>
                        </div>
                        <p className="text-sm"><span className="font-semibold">Fase:</span> {obra.fase}</p>
                        {obra.contatos[0] && (
                             <div className="flex items-center space-x-2 text-sm">
                                <UserIcon className="w-4 h-4 text-gray-500" />
                                <span>{obra.contatos[0].nome}</span>
                                <a href={`https://wa.me/${obra.contatos[0].telefone}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                    <PhoneIcon className="w-4 h-4 text-green-500" />
                                </a>
                            </div>
                        )}
                        {obra.propostas.length > 0 && (
                            <div className="text-sm bg-gray-50 p-2 rounded-md">
                                {obra.propostas.map(p => (
                                     <p key={p.id}>
                                        <span className="font-semibold">{p.representada}: </span>
                                        {p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                     </p>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end items-center pt-2 border-t mt-2 gap-4">
                            <button onClick={(e) => { e.stopPropagation(); onNavigate(obra); }} className="flex items-center gap-1 text-sm font-semibold text-green-600">
                                <NavigationIcon className="w-4 h-4" />
                                Navegar
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onViewOnMap(obra); }} className="text-sm font-semibold text-blue-600">Ver no Mapa</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- TAREFAS TAB ---
const TarefasTab: FC<{ obras: Obra[], onCreateRoute: (tarefas: Tarefa[]) => void; onEditObra: (obra: Obra) => void; }> = ({ obras, onCreateRoute, onEditObra }) => {
    const [filter, setFilter] = useState<'hoje' | 'todas' | 'futuras' | 'personalizada'>('hoje');
    // For custom date range, you would add state here e.g., [startDate, setStartDate]

    const allTasks = useMemo(() => {
        return obras.flatMap(obra => 
            obra.tarefas.map(t => ({...t, obraNome: obra.nome, obraConstrutora: obra.construtora, obraRef: obra}))
        ).sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [obras]);

    const filteredTasks = useMemo(() => {
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        
        let tasks = allTasks;
        if (filter === 'hoje') {
            tasks = allTasks.filter(t => {
                const taskDate = new Date(t.data);
                taskDate.setHours(0,0,0,0);
                return taskDate.getTime() === hoje.getTime();
            });
        } else if (filter === 'futuras') {
            const tomorrow = new Date(hoje);
            tomorrow.setDate(hoje.getDate() + 1);
            tasks = allTasks.filter(t => new Date(t.data) >= tomorrow);
        } else if (filter === 'todas') {
            return tasks;
        }
        // 'personalizada' filter logic would go here
        return tasks;
    }, [allTasks, filter]);

    const taskCounters = useMemo(() => {
        const counts = { atrasadas: 0, emDia: 0 };
        const agora = new Date();
        filteredTasks.forEach(t => {
            if (new Date(t.data) < agora && t.status === 'Pendente') {
                counts.atrasadas++;
            } else {
                counts.emDia++;
            }
        });
        return counts;
    }, [filteredTasks]);

    const handleCreateRoute = () => {
        const visitTasks = filteredTasks.filter(t => t.tipo === TipoTarefa.VISITA);
        onCreateRoute(visitTasks);
    };

    const getTaskStatus = (task: Tarefa) => {
        if (task.status === 'Concluída') return { text: 'Concluída', color: 'text-green-600' };
        if (new Date(task.data) < new Date()) return { text: 'Atrasada', color: 'text-red-600' };
        return { text: 'Em dia', color: 'text-blue-600' };
    };
    
    const TaskCard: FC<{ task: Tarefa & { obraNome: string, obraConstrutora: string, obraRef: Obra } }> = ({ task }) => {
        const status = getTaskStatus(task);
        return (
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-2" onClick={() => onEditObra(task.obraRef)}>
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold">{task.titulo}</h4>
                        <p className="text-sm text-gray-500">{task.obraNome} - {task.obraConstrutora}</p>
                    </div>
                     <span className={`text-xs font-bold ${status.color}`}>{status.text}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-700">
                    <span className="flex items-center gap-1.5">
                        {task.tipo === TipoTarefa.VISITA ? <RouteIcon className="w-4 h-4" /> : task.tipo === TipoTarefa.LIGACAO ? <PhoneIcon className="w-4 h-4" /> : <MailIcon className="w-4 h-4" />}
                        {task.tipo}
                    </span>
                    <span>{new Date(task.data).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {task.descricao && <p className="text-sm bg-gray-50 p-2 rounded-md">{task.descricao}</p>}
            </div>
        )
    };

    return (
        <div className="p-4 space-y-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex justify-around">
                    <button onClick={() => setFilter('hoje')} className={`px-3 py-1 text-sm rounded-full font-semibold ${filter === 'hoje' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Hoje</button>
                    <button onClick={() => setFilter('futuras')} className={`px-3 py-1 text-sm rounded-full font-semibold ${filter === 'futuras' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Futuras</button>
                    <button onClick={() => setFilter('todas')} className={`px-3 py-1 text-sm rounded-full font-semibold ${filter === 'todas' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Todas</button>
                </div>
                 <div className="flex justify-around text-center mt-3 pt-3 border-t">
                    <div><p className="font-bold text-red-600">{taskCounters.atrasadas}</p><p className="text-xs">Atrasadas</p></div>
                    <div><p className="font-bold text-blue-600">{taskCounters.emDia}</p><p className="text-xs">Em Dia</p></div>
                </div>
            </div>
            
            {filteredTasks.some(t => t.tipo === TipoTarefa.VISITA) && (
                <button onClick={handleCreateRoute} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 font-semibold">
                    <RouteIcon className="w-5 h-5" />
                    Roteirizar Visitas
                </button>
            )}

            <div className="space-y-3">
                {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => <TaskCard key={task.id} task={task} />)
                ) : (
                    <p className="text-center text-gray-500 mt-8">Nenhuma tarefa para exibir.</p>
                )}
            </div>
        </div>
    );
};

// --- DASHBOARD TAB ---
const DashboardTab: FC<{ obras: Obra[], metas: Metas }> = ({ obras, metas }) => {
    const [showPercentage, setShowPercentage] = useState(false);

    const data = useMemo(() => {
        const closedObras = obras.filter(o => o.etapa === EtapaLead.FECHADO);
        const allTasks = obras.flatMap(o => o.tarefas.filter(t => t.status === 'Concluída'));
        
        const closedValue = closedObras.reduce((sum, o) => sum + o.propostas.reduce((s,p) => s + p.valor, 0), 0);
        const visits = allTasks.filter(t => t.tipo === TipoTarefa.VISITA).length;
        const calls = allTasks.filter(t => t.tipo === TipoTarefa.LIGACAO).length;

        const obrasPorEtapa = ETAPA_LEAD_OPTIONS.map(etapa => ({
            name: etapa.label,
            value: obras.filter(o => o.etapa === etapa.value).length,
            color: etapa.color.replace('bg-', '') // convert bg-blue-500 to blue-500 for tailwind text color
        }));

        const propostasPorRepresentada = Object.values(Representada).map(r => ({
            name: r,
            Propostas: obras.flatMap(o => o.propostas).filter(p => p.representada === r).length,
        }));
        
        const valorPropostasPorRepresentada = Object.values(Representada).map(r => ({
            name: r,
            Valor: obras.flatMap(o => o.propostas).filter(p => p.representada === r).reduce((s,p) => s + p.valor, 0),
        }));

        const valorFechadoPorRepresentada = Object.values(Representada).map(r => ({
            name: r,
            Valor: closedObras.flatMap(o => o.propostas).filter(p => p.representada === r).reduce((s,p) => s + p.valor, 0),
        }));

        return { closedValue, visits, calls, obrasPorEtapa, propostasPorRepresentada, valorPropostasPorRepresentada, valorFechadoPorRepresentada };
    }, [obras]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const StatCard: FC<{title: string; value: number; meta?: number; isCurrency?: boolean; showPercentage: boolean; icon: React.ReactNode}> = ({title, value, meta, isCurrency = false, showPercentage, icon}) => {
        let displayValue = '';
        if (showPercentage && meta && meta > 0) {
            displayValue = (value / meta).toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1 });
        } else {
            displayValue = isCurrency ? value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : value.toString();
        }
    
        return (
            <div className="bg-white p-4 rounded-lg shadow-sm flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">{icon}</div>
                <div>
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-2xl font-bold">{displayValue}</p>
                    {meta !== undefined && !showPercentage && <p className="text-xs text-gray-500">Meta: {isCurrency ? meta.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : meta}</p>}
                </div>
            </div>
        );
    };

    const valorFechadoPorRepresentadaData = Object.values(Representada).map(r => ({
        name: r,
        Valor: data.valorFechadoPorRepresentada.find(item => item.name === r)?.Valor || 0,
        Meta: metas.porRepresentada[r] || 0
    }));
    
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Dashboard de Resultados</h2>
            <button 
                onClick={() => setShowPercentage(s => !s)} 
                className={`px-3 py-1.5 text-sm font-semibold rounded-full flex items-center gap-1 ${showPercentage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
                %
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Vendas Fechadas" value={data.closedValue} meta={metas.vendasTotais} isCurrency showPercentage={showPercentage} icon={<BriefcaseIcon className="w-6 h-6 text-blue-600" />} />
            <StatCard title="Visitas Realizadas" value={data.visits} meta={metas.visitas} showPercentage={showPercentage} icon={<RouteIcon className="w-6 h-6 text-blue-600" />} />
            <StatCard title="Ligações Realizadas" value={data.calls} meta={metas.ligacoes} showPercentage={showPercentage} icon={<PhoneIcon className="w-6 h-6 text-blue-600" />} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Obras por Etapa</h3>
                 <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={data.obrasPorEtapa} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {data.obrasPorEtapa.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} obras`} />
                      <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Metas por Representada</h3>
                <div className="space-y-3 pt-2">
                    {valorFechadoPorRepresentadaData.map(item => (
                        <div key={item.name}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                <span className="text-sm font-medium text-gray-500">
                                    {showPercentage && item.Meta > 0
                                        ? (item.Valor / item.Meta).toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1 })
                                        : `${item.Valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })} / ${item.Meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}`
                                    }
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min((item.Valor / (item.Meta || 1)) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
             <div className="bg-white p-4 rounded-lg shadow-sm lg:col-span-2">
                 <h3 className="font-semibold mb-2">Valor Fechado por Representada</h3>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.valorFechadoPorRepresentada}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}/>
                        <Legend />
                        <Bar dataKey="Valor" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    );
};

// --- PERFIL TAB ---
const PerfilTab: FC<{ 
    user: User; 
    metas: Metas;
    onUpdateMetas: (newMetas: Metas) => void;
    onLogout: () => void;
}> = ({ user, metas, onUpdateMetas, onLogout }) => {
    const [isEditingMetas, setIsEditingMetas] = useState(false);
    const [tempMetas, setTempMetas] = useState(metas);
    
    useEffect(() => {
        setTempMetas(metas);
    }, [metas]);

    const handleSaveMetas = () => {
        onUpdateMetas(tempMetas);
        setIsEditingMetas(false);
    }

    const handlePasswordReset = async () => {
        if(user.email) {
            try {
                await sendPasswordResetEmail(auth, user.email);
                alert("Um e-mail de redefinição de senha foi enviado para você.");
            } catch(error) {
                alert("Não foi possível enviar o e-mail de redefinição de senha.");
            }
        }
    }

    return (
        <div className="p-4 space-y-6">
            <div className="text-center">
                <div className="inline-block bg-gray-200 p-4 rounded-full">
                    <UserIcon className="w-16 h-16 text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold mt-4">{user.nomeCompleto}</h2>
                <p className="text-gray-500">{user.email}</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <h3 className="font-semibold text-lg">Metas do Mês</h3>
                {isEditingMetas ? (
                    <div className="space-y-2">
                        <div>
                            <label className="text-sm">Vendas Totais (R$)</label>
                            <input type="number" value={tempMetas.vendasTotais} onChange={e => setTempMetas({...tempMetas, vendasTotais: +e.target.value})} className="w-full mt-1 p-2 border rounded"/>
                        </div>
                         <div>
                            <label className="text-sm">Nº de Visitas</label>
                            <input type="number" value={tempMetas.visitas} onChange={e => setTempMetas({...tempMetas, visitas: +e.target.value})} className="w-full mt-1 p-2 border rounded"/>
                        </div>
                        <div>
                            <label className="text-sm">Nº de Ligações</label>
                            <input type="number" value={tempMetas.ligacoes} onChange={e => setTempMetas({...tempMetas, ligacoes: +e.target.value})} className="w-full mt-1 p-2 border rounded"/>
                        </div>
                        {Object.values(Representada).map(key => (
                             <div key={key}>
                                <label className="text-sm">Meta {key} (R$)</label>
                                <input type="number" value={tempMetas.porRepresentada[key as Representada] || 0} onChange={e => setTempMetas({...tempMetas, porRepresentada: {...tempMetas.porRepresentada, [key]: +e.target.value}})} className="w-full mt-1 p-2 border rounded"/>
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <button onClick={handleSaveMetas} className="w-full bg-blue-600 text-white p-2 rounded">Salvar</button>
                            <button onClick={() => { setIsEditingMetas(false); setTempMetas(metas); }} className="w-full bg-gray-300 p-2 rounded">Cancelar</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1 text-sm">
                       <p><strong>Vendas Totais:</strong> {metas.vendasTotais.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                       <p><strong>Visitas:</strong> {metas.visitas}</p>
                       <p><strong>Ligações:</strong> {metas.ligacoes}</p>
                       <button onClick={() => setIsEditingMetas(true)} className="w-full mt-2 bg-gray-200 text-gray-800 p-2 rounded font-semibold">Editar Metas</button>
                    </div>
                )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                 <h3 className="font-semibold text-lg">Segurança</h3>
                 <button onClick={handlePasswordReset} className="w-full bg-gray-200 text-gray-800 p-2 rounded font-semibold">Redefinir Senha</button>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <h3 className="font-semibold text-lg">Dados do Aplicativo</h3>
                <p className="text-sm text-gray-600">
                    Seus dados são salvos e sincronizados na nuvem automaticamente. Você pode acessá-los de qualquer dispositivo.
                </p>
            </div>

            <div className="text-center pt-4">
                 <button onClick={onLogout} className="text-red-600 font-semibold">Sair</button>
            </div>
        </div>
    );
};

// --- MODAL/FORM COMPONENT ---
const ObraFormModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (obra: Obra, files: {fotos: File[], propostas: {id: string, file: File}[]}) => void;
  obraToEdit?: Obra;
  initialCoords?: { lat: number, lng: number };
}> = ({ isOpen, onClose, onSave, obraToEdit, initialCoords }) => {
    const [obra, setObra] = useState<Obra | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'tasks' | 'proposals'>('details');
    const [fotoFiles, setFotoFiles] = useState<File[]>([]);
    const [propostaFiles, setPropostaFiles] = useState<Map<string, File>>(new Map());

    useEffect(() => {
        if (isOpen) {
            if (obraToEdit) {
                setObra(JSON.parse(JSON.stringify(obraToEdit))); // Deep copy
            } else if (initialCoords) {
                 setObra({
                    id: '', // Firestore will generate ID
                    nome: '',
                    dataCadastro: new Date().toISOString().split('T')[0],
                    fase: FaseObra.FUNDACAO,
                    contatos: [],
                    etapa: EtapaLead.LEAD,
                    construtora: '',
                    fotos: [],
                    tarefas: [],
                    propostas: [],
                    lat: initialCoords.lat,
                    lng: initialCoords.lng,
                    lastUpdated: new Date().toISOString(),
                 });
            }
            setActiveTab('details');
            setFotoFiles([]);
            setPropostaFiles(new Map());
        } else {
            setObra(null);
        }
    }, [isOpen, obraToEdit, initialCoords]);
    
    if (!isOpen || !obra) return null;

    const handleSave = () => {
        const obraToSave = {
            ...obra,
            lastUpdated: new Date().toISOString(),
        };
        const propostasArray = Array.from(propostaFiles.entries()).map(([id, file]) => ({id, file}));
        onSave(obraToSave, {fotos: fotoFiles, propostas: propostasArray});
    };
    
    const handleAddContato = () => {
        setObra(o => o ? {...o, contatos: [...o.contatos, { id: `c_${Date.now()}`, nome: '', telefone: '', email: '' }] } : null);
    };

    const handleUpdateContato = (index: number, field: keyof Contato, value: string) => {
        setObra(o => {
            if (!o) return null;
            const newContatos = [...o.contatos];
            newContatos[index] = {...newContatos[index], [field]: value};
            return {...o, contatos: newContatos};
        });
    };
    
    const handleRemoveContato = (id: string) => {
        setObra(o => o ? {...o, contatos: o.contatos.filter(c => c.id !== id)} : null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFotoFiles(prev => [...prev, ...newFiles]);

            newFiles.forEach(file => {
                 const reader = new FileReader();
                 reader.onload = (event) => {
                    if (event.target?.result) {
                        setObra(o => o ? {...o, fotos: [...o.fotos, event.target!.result as string]} : null);
                    }
                 };
                 reader.readAsDataURL(file);
            });
        }
    };
    
    const handleRemoveImage = (index: number) => {
        setObra(o => o ? {...o, fotos: o.fotos.filter((_, i) => i !== index)} : null);
        // This is a simplified removal, assumes order is maintained. A more robust solution would map URLs to files.
        setFotoFiles(f => f.filter((_, i) => i !== index));
    }
    
    const handleUpdateTarefa = (tarefa: Tarefa) => {
         setObra(o => {
            if (!o) return null;
            const existing = o.tarefas.find(t => t.id === tarefa.id);
            if (existing) {
                return {...o, tarefas: o.tarefas.map(t => t.id === tarefa.id ? tarefa : t)};
            }
            return {...o, tarefas: [...o.tarefas, tarefa]};
         });
    };

    const handleRemoveTarefa = (id: string) => {
        setObra(o => o ? {...o, tarefas: o.tarefas.filter(t => t.id !== id)} : null);
    }
    
    const handleUpdateProposta = (proposta: Proposta, file?: File) => {
         setObra(o => {
            if (!o) return null;
            const existing = o.propostas.find(p => p.id === proposta.id);
            if (existing) {
                return {...o, propostas: o.propostas.map(p => p.id === proposta.id ? proposta : p)};
            }
            return {...o, propostas: [...o.propostas, proposta]};
         });
         if (file) {
            setPropostaFiles(prev => new Map(prev).set(proposta.id, file));
         }
    };

    const handleRemoveProposta = (id: string) => {
        setObra(o => o ? {...o, propostas: o.propostas.filter(p => p.id !== id)} : null);
        setPropostaFiles(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });
    }

    const FormInput: FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
        <div><label className="text-sm font-medium text-gray-700">{label}</label><div className="mt-1">{children}</div></div>
    );

    const renderDetails = () => (
         <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormInput label="Nome da Obra">
                    <input type="text" value={obra.nome} onChange={(e) => setObra({...obra, nome: e.target.value})} className="w-full p-2 border rounded-md" />
                </FormInput>
                 <FormInput label="Data Cadastro">
                    <input type="date" value={obra.dataCadastro} onChange={(e) => setObra({...obra, dataCadastro: e.target.value})} className="w-full p-2 border rounded-md" />
                </FormInput>
                 <FormInput label="Fase da Obra">
                    <select value={obra.fase} onChange={(e) => setObra({...obra, fase: e.target.value as FaseObra})} className="w-full p-2 border rounded-md bg-white">
                        {FASE_OBRA_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </FormInput>
                 <FormInput label="CNPJ">
                    <input type="text" value={obra.cnpj || ''} onChange={(e) => setObra({...obra, cnpj: e.target.value})} className="w-full p-2 border rounded-md" />
                </FormInput>
            </div>
             <FormInput label="Construtora Matriz">
                <input type="text" value={obra.construtora} onChange={(e) => setObra({...obra, construtora: e.target.value})} className="w-full p-2 border rounded-md" />
            </FormInput>
            <div>
                <label className="text-sm font-medium text-gray-700">Etapa</label>
                <div className="flex flex-wrap gap-2 mt-2">
                {ETAPA_LEAD_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setObra({...obra, etapa: opt.value})} 
                        className={`px-3 py-1.5 text-sm rounded-full font-semibold transition ${obra.etapa === opt.value ? `${opt.color} text-white` : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                        {opt.label}
                    </button>
                ))}
                </div>
            </div>
            <div>
                 <h4 className="text-sm font-medium text-gray-700 mb-2">Contatos</h4>
                 <div className="space-y-3">
                 {obra.contatos.map((contato, index) => (
                    <div key={contato.id} className="p-3 bg-gray-50 rounded-lg space-y-2 relative">
                         <button onClick={() => handleRemoveContato(contato.id)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                         <input type="text" placeholder="Nome" value={contato.nome} onChange={(e) => handleUpdateContato(index, 'nome', e.target.value)} className="w-full p-2 border rounded-md"/>
                         <div className="grid grid-cols-2 gap-2">
                            <input type="tel" placeholder="Telefone" value={contato.telefone} onChange={(e) => handleUpdateContato(index, 'telefone', e.target.value)} className="w-full p-2 border rounded-md"/>
                            <input type="email" placeholder="Email" value={contato.email} onChange={(e) => handleUpdateContato(index, 'email', e.target.value)} className="w-full p-2 border rounded-md"/>
                         </div>
                    </div>
                 ))}
                 </div>
                 <button onClick={handleAddContato} className="mt-2 text-sm text-blue-600 font-semibold flex items-center gap-1"><PlusCircleIcon className="w-4 h-4"/> Adicionar Contato</button>
            </div>
             <div>
                <label className="text-sm font-medium text-gray-700">Fotos da Obra</label>
                <div className="mt-1 flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <PlusCircleIcon className="w-8 h-8 mb-2 text-gray-500" />
                            <p className="text-sm text-gray-500"><span className="font-semibold">Clique para enviar</span></p>
                        </div>
                        <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
                    </label>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                    {obra.fotos.map((fotoUrl, index) => (
                        <div key={index} className="relative">
                            <img src={fotoUrl} alt={`Foto ${index+1}`} className="w-full h-20 object-cover rounded-md"/>
                            <button onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><XIcon className="w-3 h-3"/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
    
    const renderTasks = () => (
        <TaskEditor obraId={obra.id} tasks={obra.tarefas} onUpdate={handleUpdateTarefa} onRemove={handleRemoveTarefa} />
    );

    const renderProposals = () => (
        <ProposalEditor proposals={obra.propostas} onUpdate={handleUpdateProposta} onRemove={handleRemoveProposta} />
    );


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[2000] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold">{obraToEdit ? 'Editar Obra' : 'Cadastrar Obra'}</h2>
                    <button onClick={onClose}><XIcon className="w-6 h-6 text-gray-500" /></button>
                </div>
                
                <div className="p-4 overflow-y-auto flex-grow">
                     <div className="border-b border-gray-200 mb-4">
                        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                            <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Detalhes</button>
                            <button onClick={() => setActiveTab('tasks')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'tasks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Tarefas</button>
                             <button onClick={() => setActiveTab('proposals')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'proposals' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Propostas</button>
                        </nav>
                    </div>
                    {activeTab === 'details' && renderDetails()}
                    {activeTab === 'tasks' && renderTasks()}
                    {activeTab === 'proposals' && renderProposals()}
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar</button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-EDITORS FOR MODAL ---
const TaskEditor: FC<{
    obraId: string;
    tasks: Tarefa[];
    onUpdate: (task: Tarefa) => void;
    onRemove: (id: string) => void;
}> = ({ obraId, tasks, onUpdate, onRemove }) => {
    const [editingTask, setEditingTask] = useState<Tarefa | null>(null);

    const handleSave = () => {
        if (editingTask) {
            onUpdate(editingTask);
            setEditingTask(null);
        }
    };
    
    const startNewTask = () => {
        setEditingTask({
            id: `t_${Date.now()}`,
            obraId,
            titulo: '',
            tipo: TipoTarefa.VISITA,
            data: new Date().toISOString().slice(0, 16),
            descricao: '',
            status: 'Pendente'
        });
    };
    
    if (editingTask) {
        return (
            <div className="p-3 bg-blue-50 rounded-lg space-y-3">
                <h4 className="font-semibold">{editingTask.id.startsWith('t_') ? 'Nova Tarefa' : 'Editar Tarefa'}</h4>
                 <input type="text" placeholder="Título" value={editingTask.titulo} onChange={e => setEditingTask({...editingTask, titulo: e.target.value})} className="w-full p-2 border rounded"/>
                 <select value={editingTask.tipo} onChange={e => setEditingTask({...editingTask, tipo: e.target.value as TipoTarefa})} className="w-full p-2 border rounded bg-white">
                     {Object.values(TipoTarefa).map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
                 <input type="datetime-local" value={editingTask.data} onChange={e => setEditingTask({...editingTask, data: e.target.value})} className="w-full p-2 border rounded"/>
                 <textarea placeholder="Descrição" value={editingTask.descricao} onChange={e => setEditingTask({...editingTask, descricao: e.target.value})} className="w-full p-2 border rounded"/>
                 <select value={editingTask.status} onChange={e => setEditingTask({...editingTask, status: e.target.value as 'Pendente'|'Concluída'})} className="w-full p-2 border rounded bg-white">
                    <option value="Pendente">Pendente</option>
                    <option value="Concluída">Concluída</option>
                 </select>
                 <div className="flex gap-2">
                    <button onClick={handleSave} className="w-full bg-blue-600 text-white p-2 rounded">Salvar</button>
                    <button onClick={() => setEditingTask(null)} className="w-full bg-gray-300 p-2 rounded">Cancelar</button>
                 </div>
            </div>
        )
    }

    return (
        <div>
            <button onClick={startNewTask} className="w-full mb-4 flex items-center justify-center gap-2 bg-blue-100 text-blue-700 p-2 rounded-md font-semibold">
                <PlusIcon className="w-5 h-5"/> Adicionar Tarefa
            </button>
             <div className="space-y-2">
                {tasks.map(task => (
                    <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                           <div>
                            <p className="font-semibold">{task.titulo}</p>
                            <p className="text-sm text-gray-600">{task.tipo} - {new Date(task.data).toLocaleString('pt-BR')}</p>
                           </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingTask(task)} className="text-gray-500 hover:text-blue-600"><EditIcon className="w-4 h-4"/></button>
                                <button onClick={() => onRemove(task.id)} className="text-gray-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProposalEditor: FC<{
    proposals: Proposta[];
    onUpdate: (proposal: Proposta, file?: File) => void;
    onRemove: (id: string) => void;
}> = ({ proposals, onUpdate, onRemove }) => {
    const [editing, setEditing] = useState<Proposta | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const startNew = () => {
        setEditing({
            id: `p_${Date.now()}`,
            representada: Representada.DM2,
            produto: REPRESENTADA_PRODUTOS_MAP[Representada.DM2][0],
            valor: 0,
        });
    };
    
    const handleSave = () => {
        if (editing) {
            onUpdate(editing);
            setEditing(null);
        }
    };

    const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && editing) {
            const file = e.target.files[0];
            const updatedProposal = {
                ...editing,
                anexoNome: file.name,
            };
            setEditing(updatedProposal);
            onUpdate(updatedProposal, file);
        }
    }
    
    const openFile = (proposal: Proposta) => {
        if(proposal.anexoUrl) {
            window.open(proposal.anexoUrl, '_blank');
        }
    };


    if (editing) {
        const produtos = REPRESENTADA_PRODUTOS_MAP[editing.representada];
        return (
            <div className="p-3 bg-green-50 rounded-lg space-y-3">
                <h4 className="font-semibold">{editing.id.startsWith('p_') ? 'Nova Proposta' : 'Editar Proposta'}</h4>
                <select value={editing.representada} onChange={e => setEditing({...editing, representada: e.target.value as Representada, produto: REPRESENTADA_PRODUTOS_MAP[e.target.value as Representada][0]})} className="w-full p-2 border rounded bg-white">
                     {Object.values(Representada).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={editing.produto} onChange={e => setEditing({...editing, produto: e.target.value})} className="w-full p-2 border rounded bg-white">
                     {produtos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="number" placeholder="Valor" value={editing.valor} onChange={e => setEditing({...editing, valor: +e.target.value})} className="w-full p-2 border rounded"/>
                <div>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full text-sm bg-gray-200 p-2 rounded">
                        {editing.anexoNome ? `Anexo: ${editing.anexoNome}` : 'Anexar Proposta'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileAttach} className="hidden" />
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="w-full bg-blue-600 text-white p-2 rounded">Salvar</button>
                    <button onClick={() => setEditing(null)} className="w-full bg-gray-300 p-2 rounded">Cancelar</button>
                </div>
            </div>
        )
    }

    return (
        <div>
            <button onClick={startNew} className="w-full mb-4 flex items-center justify-center gap-2 bg-green-100 text-green-700 p-2 rounded-md font-semibold">
                <PlusIcon className="w-5 h-5"/> Adicionar Proposta
            </button>
             <div className="space-y-2">
                {proposals.map(prop => (
                    <div key={prop.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                           <div>
                            <p className="font-semibold">{prop.representada} - {prop.produto}</p>
                            <p className="text-lg font-bold text-green-700">{prop.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                            {prop.anexoNome && <button onClick={() => openFile(prop)} className="text-sm text-blue-600 hover:underline">{prop.anexoNome}</button>}
                           </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditing(prop)} className="text-gray-500 hover:text-blue-600"><EditIcon className="w-4 h-4"/></button>
                                <button onClick={() => onRemove(prop.id)} className="text-gray-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};



const App: React.FC = () => {
  const [page, setPage] = useState<'login' | 'signup' | 'forgot'>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('mapa');
  const [obras, setObras] = useState<Obra[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [obraToEdit, setObraToEdit] = useState<Obra | undefined>(undefined);
  const [initialCoords, setInitialCoords] = useState<{ lat: number, lng: number } | undefined>(undefined);
  const [routeToDraw, setRouteToDraw] = useState<Obra[] | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [metas, setMetas] = useState<Metas>({
    vendasTotais: 0, visitas: 0, ligacoes: 0, porRepresentada: {} as Record<Representada, number>
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setIsLoading(true);
        if (user && user.emailVerified) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setCurrentUser(userDoc.data() as User);
                await loadAllData(user.uid);
            } else {
                // This case might happen if user doc creation failed during signup
                // Or if an old auth user exists without a DB entry.
                // For now, we log them out.
                await signOut(auth);
            }
        } else {
            setCurrentUser(null);
            setObras([]);
            setMetas({ vendasTotais: 0, visitas: 0, ligacoes: 0, porRepresentada: {} as Record<Representada, number> });
            setRegions([]);
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadAllData = async (userId: string) => {
    try {
      const obrasQuery = query(collection(db, "users", userId, "obras"));
      const obrasSnapshot = await getDocs(obrasQuery);
      const obrasData = obrasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
      setObras(obrasData);

      const regionsQuery = query(collection(db, "users", userId, "regions"));
      const regionsSnapshot = await getDocs(regionsQuery);
      const regionsData = regionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region));
      setRegions(regionsData);
      
      const metasDocRef = doc(db, "users", userId, "profile", "metas");
      const metasDoc = await getDoc(metasDocRef);
      if (metasDoc.exists()) {
          setMetas(metasDoc.data() as Metas);
      } else {
          // Initialize default metas if none exist
          const defaultMetas: Metas = {
            vendasTotais: 0, visitas: 0, ligacoes: 0, porRepresentada: Object.fromEntries(Object.values(Representada).map(r => [r, 0])) as Record<Representada, number>
          };
          setMetas(defaultMetas);
      }

    } catch (error: any) {
      alert(`Erro ao carregar dados: ${error.message}`);
      await handleLogout(); 
    }
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    setPage('login');
  };
  
  const handleOpenLeadForm = (coords?: { lat: number, lng: number }, obra?: Obra) => {
    setObraToEdit(obra);
    setInitialCoords(coords);
    setIsFormOpen(true);
  };

  const handleCloseLeadForm = () => {
    setIsFormOpen(false);
    setObraToEdit(undefined);
    setInitialCoords(undefined);
  };

  const handleSaveObra = async (obraData: Obra, files: {fotos: File[], propostas: {id: string, file: File}[]}) => {
    if (!currentUser) return;
    
    try {
        const obraToSave = { ...obraData };

        // Upload new photos
        const fotoUrls = await Promise.all(
            files.fotos.map(async (file) => {
                const filePath = `users/${currentUser.id}/obras/${obraToSave.id || Date.now()}/${file.name}`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, file);
                return getDownloadURL(fileRef);
            })
        );
        obraToSave.fotos = [...obraToSave.fotos.filter(url => url.startsWith('http')), ...fotoUrls]; // Keep existing, add new

        // Upload new proposal attachments
        for (const propFile of files.propostas) {
            const proposalIndex = obraToSave.propostas.findIndex(p => p.id === propFile.id);
            if(proposalIndex > -1) {
                const filePath = `users/${currentUser.id}/propostas/${obraToSave.id}/${propFile.file.name}`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, propFile.file);
                const downloadUrl = await getDownloadURL(fileRef);
                obraToSave.propostas[proposalIndex].anexoUrl = downloadUrl;
                obraToSave.propostas[proposalIndex].anexoPath = filePath;
            }
        }

        let savedObra: Obra;
        const obraCollectionRef = collection(db, "users", currentUser.id, "obras");
        
        if (obraToSave.id) {
            const obraDocRef = doc(obraCollectionRef, obraToSave.id);
            await setDoc(obraDocRef, obraToSave);
            savedObra = obraToSave;
        } else {
            const newDocRef = await addDoc(obraCollectionRef, obraToSave);
            savedObra = { ...obraToSave, id: newDocRef.id };
            await setDoc(newDocRef, savedObra); // Update with the generated ID
        }
        
        const index = obras.findIndex(o => o.id === savedObra.id);
        if (index > -1) {
          setObras(obras.map(o => o.id === savedObra.id ? savedObra : o));
        } else {
          setObras([...obras, savedObra]);
        }
        handleCloseLeadForm();
    } catch (error: any) {
        alert(`Erro ao salvar a obra: ${error.message}`);
    }
  };
  
  const handleViewOnMap = (obra: Obra) => {
    setFlyToTarget([obra.lat, obra.lng]);
    setActiveTab('mapa');
  };
  
  const handleCreateRoute = (tarefas: Tarefa[]) => {
     const obraIds = [...new Set(tarefas.map(t => t.obraId))];
     const obrasOnRoute = obras.filter(o => obraIds.includes(o.id));
     setRouteToDraw(obrasOnRoute);
     setActiveTab('mapa');
  };

  const handleUpdateMetas = async (newMetas: Metas) => {
    if (!currentUser) return;
    try {
        const metasDocRef = doc(db, "users", currentUser.id, "profile", "metas");
        await setDoc(metasDocRef, newMetas);
        setMetas(newMetas);
    } catch(error: any) {
        alert(`Erro ao salvar as metas: ${error.message}`);
    }
  };
  
  const handleNavigate = (obra: Obra) => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${obra.lat},${obra.lng}`;
      window.open(url, '_blank');
  };

  const handleAddRegion = async (regionData: Omit<Region, 'id'>) => {
      if (!currentUser) return;
      try {
        const regionCollectionRef = collection(db, "users", currentUser.id, "regions");
        const newDocRef = await addDoc(regionCollectionRef, regionData);
        const newRegion = { ...regionData, id: newDocRef.id };
        await setDoc(newDocRef, newRegion);
        setRegions(prev => [...prev, newRegion]);
      } catch (error: any) {
          alert(`Erro ao salvar a região: ${error.message}`);
      }
  };

  const handleDeleteRegion = async (id: string) => {
      if (!currentUser) return;
      try {
        const regionDocRef = doc(db, "users", currentUser.id, "regions", id);
        await deleteDoc(regionDocRef);
        setRegions(prev => prev.filter(r => r.id !== id));
      } catch (error: any) {
          alert(`Erro ao deletar a região: ${error.message}`);
      }
  };
  
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'mapa':
        return <MapTab 
                    obras={obras} 
                    openLeadForm={handleOpenLeadForm} 
                    routeToDraw={routeToDraw} 
                    clearRoute={() => setRouteToDraw(null)} 
                    flyToTarget={flyToTarget}
                    onFlyToComplete={() => setFlyToTarget(null)}
                    regions={regions}
                    onAddRegion={handleAddRegion}
                    onDeleteRegion={handleDeleteRegion}
                    onNavigate={handleNavigate}
                />;
      case 'lista':
        return <ListaTab obras={obras} onEdit={(obra) => handleOpenLeadForm(undefined, obra)} onViewOnMap={handleViewOnMap} onNavigate={handleNavigate} />;
      case 'tarefas':
        return <TarefasTab obras={obras} onCreateRoute={handleCreateRoute} onEditObra={(obra) => handleOpenLeadForm(undefined, obra)} />;
      case 'dashboard':
        return currentUser ? <DashboardTab obras={obras} metas={metas} /> : null;
      case 'perfil':
        return currentUser ? <PerfilTab user={currentUser} metas={metas} onUpdateMetas={handleUpdateMetas} onLogout={handleLogout} /> : null;
      default:
        return null;
    }
  }, [activeTab, obras, currentUser, routeToDraw, flyToTarget, regions, metas]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen bg-gray-100 text-gray-700 font-semibold">Carregando ObraMap...</div>;
  }
  
  if (!currentUser) {
    return <AuthManager page={page} setPage={setPage} />;
  }

  const NavItem: FC<{ tabName: string, icon: React.ReactNode, label: string }> = ({ tabName, icon, label }) => (
    <button onClick={() => setActiveTab(tabName)} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${activeTab === tabName ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}>
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );

  return (
    <div className="h-[100dvh] w-screen bg-gray-100 flex flex-col font-sans">
      <main className="flex-1 overflow-y-auto">
        {tabContent}
      </main>
      <footer className="flex justify-around items-center bg-white border-t border-gray-200 shadow-lg">
        <NavItem tabName="mapa" icon={<MapIcon className="w-6 h-6" />} label="Mapa" />
        <NavItem tabName="lista" icon={<ListIcon className="w-6 h-6" />} label="Obras" />
        <NavItem tabName="tarefas" icon={<CheckSquareIcon className="w-6 h-6" />} label="Tarefas" />
        <NavItem tabName="dashboard" icon={<BarChartIcon className="w-6 h-6" />} label="Dashboard" />
        <NavItem tabName="perfil" icon={<UserIcon className="w-6 h-6" />} label="Perfil" />
      </footer>
      <ObraFormModal 
        isOpen={isFormOpen}
        onClose={handleCloseLeadForm}
        onSave={handleSaveObra}
        obraToEdit={obraToEdit}
        initialCoords={initialCoords}
      />
    </div>
  );
};

export default App;
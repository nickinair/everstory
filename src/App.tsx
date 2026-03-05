import { useState, useEffect } from 'react';
import {
  Home,
  BookOpen,
  Clock,
  ShoppingBag,
  Settings,
  Gift,
  ChevronDown,
  Plus,
  Edit2,
  Users,
  MessageCircle,
  Menu,
  X,
  User as UserIcon,
  Share2,
  Loader2,
  Bell,
  Shield,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  Folder,
  UserPlus,
  Ticket,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAvatarUrl } from './lib/avatar';
import { ViewType, Story, Prompt, Order, Project, User } from './types';
import { supabase } from './lib/supabaseClient';
import { databaseService } from './services/databaseService';
import AuthView from './components/AuthView';
import InviteModal from './components/InviteModal';

// Views
import HomeView from './components/HomeView';
import PromptsView from './components/PromptsView';
import StoriesView from './components/StoriesView';
import OrderBookView from './components/OrderBookView';
import OrderTrackingView from './components/OrderTrackingView';
import OrderDetailView from './components/OrderDetailView';
import SettingsView from './components/SettingsView';
import AccountSettingsView from './components/AccountSettingsView';
import StoryDetailView from './components/StoryDetailView';
import AddStoryView from './components/AddStoryView';
import ProjectDetailView from './components/ProjectDetailView';
import RecordingFlow from './components/RecordingFlow';
import TencentDesk, { openTencentChat } from './components/TencentDesk';
import BuyNowView from './components/BuyNowView';
import UpgradeModal from './components/UpgradeModal';
import JoinConfirmationModal from './components/JoinConfirmationModal';
import RedemptionView from './components/RedemptionView';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    return (localStorage.getItem('everstory-last-view') as ViewType) || 'home';
  });
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [projectDetailId, setProjectDetailId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    return localStorage.getItem('everstory-last-project-id');
  });
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [orderBackToHome, setOrderBackToHome] = useState(false);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalType, setUpgradeModalType] = useState<'prompts' | 'stories' | 'projects' | 'order-required'>('prompts');
  const [pendingInviteProjectId, setPendingInviteProjectId] = useState<string | null>(null);
  // High-level restriction check
  const hasOrder = orders && orders.length > 0;

  // Deep-link state: read once from URL params
  const [pendingDeepLink] = useState<{ promptId: string; projectId: string } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const promptId = params.get('promptId');
    const projectId = params.get('projectId');
    const inviteProjectId = params.get('inviteProjectId');

    if (inviteProjectId) {
      console.log('App: Found inviteProjectId in URL:', inviteProjectId);
      localStorage.setItem('everstory-pending-invite', inviteProjectId);
      // We no longer clean the URL here to avoid confusing the user in incognito mode
    }

    if (promptId && projectId) return { promptId, projectId };
    return null;
  });

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('App: Initial Session State:', session?.user?.id);
      setSession(session);
      if (session) fetchUserData(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('App: Auth State Changed:', _event, session?.user?.id);
      setSession(session);
      if (session) fetchUserData(session.user.id, false); // Fetch in background on auth changes
      else {
        setLoading(false);
        setProjects([]);
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      console.log('App: Fetching data for user:', userId);

      if (userId.startsWith('mock-')) {
        console.log('App: Using mock profile data');
        const { data: { session } } = await supabase.auth.getSession();
        setCurrentUser({
          id: userId,
          full_name: session?.user?.user_metadata?.full_name || '测试用户',
          phone: session?.user?.user_metadata?.phone || '',
          avatar_url: ''
        } as any);
      } else {
        // 1. Fetch Profile
        const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (profileErr) {
          console.error('App: Profile Fetch Error:', profileErr);
        }
        if (profile) {
          setCurrentUser(profile);
        } else {
          // Fallback for missing profile
          console.warn('App: No profile found for user:', userId);
          setCurrentUser({ id: userId, phone: 'Unknown', full_name: '新用户' } as any);
        }
      }

      // 2. Fetch Projects
      let userProjects = await databaseService.getProjects();

      // Check for pending invite from URL OR localStorage
      const params = new URLSearchParams(window.location.search);
      const urlInviteId = params.get('inviteProjectId');
      const storageInviteId = localStorage.getItem('everstory-pending-invite');
      const pendingInviteId = urlInviteId || storageInviteId;

      if (pendingInviteId) {
        console.log('App: Processing pending invite:', pendingInviteId, { fromUrl: !!urlInviteId, fromStorage: !!storageInviteId });

        // Only show modal if user is not already a member
        const isAlreadyMember = userProjects.some((p: any) => p.id === pendingInviteId);
        if (!isAlreadyMember) {
          console.log('App: User not member, showing confirmation UI');
          setPendingInviteProjectId(pendingInviteId);

          // Clean URL now that we've captured it in state
          if (window.location.search.includes('inviteProjectId')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        } else {
          console.log('App: User is already a member, clearing pending invite indicators');
          localStorage.removeItem('everstory-pending-invite');
          if (window.location.search.includes('inviteProjectId')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }

      setProjects(userProjects as any);

      let resolvedProjectId: string | null = currentProjectId; // Use current state (which came from localStorage)

      if (pendingDeepLink) {
        const deepProject = userProjects.find((p: any) => p.id === pendingDeepLink.projectId);
        resolvedProjectId = deepProject ? deepProject.id : (userProjects[0]?.id || null);
      } else if (!resolvedProjectId || !userProjects.some((p: any) => p.id === resolvedProjectId)) {
        // Fallback if no ID or ID is no longer valid
        resolvedProjectId = userProjects[0]?.id || null;
      }

      if (resolvedProjectId) {
        setCurrentProjectId(resolvedProjectId);
        localStorage.setItem('everstory-last-project-id', resolvedProjectId);
      }

      // 3. Handle deep link
      if (pendingDeepLink && resolvedProjectId) {
        try {
          const promptList = await databaseService.getPrompts(resolvedProjectId);
          const targetPrompt = promptList.find((p: any) => p.id === pendingDeepLink.promptId);
          if (targetPrompt) {
            window.history.replaceState({}, '', window.location.pathname);
            setSelectedPrompt(targetPrompt);
            setCurrentView('recording');
          }
        } catch (e) {
          console.error('Deep link prompt fetch failed:', e);
        }
      }
    } catch (error) {
      console.error('App: fetchUserData overall error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem('everstory-last-project-id', currentProjectId);
      fetchProjectData(currentProjectId);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (currentView !== 'recording' && currentView !== 'story-detail' && currentView !== 'order-detail' && currentView !== 'add-story') {
      localStorage.setItem('everstory-last-view', currentView);
    }
  }, [currentView]);

  const fetchProjectData = async (projectId: string) => {
    try {
      const [storyList, promptList, orderList] = await Promise.all([
        databaseService.getStories(projectId),
        databaseService.getPrompts(projectId),
        databaseService.getOrders(projectId)
      ]);
      setStories(storyList);
      setPrompts(promptList);
      setOrders(orderList);
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  const navItems = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'stories', label: '故事', icon: BookOpen },
    { id: 'prompts', label: '提示', icon: Clock },
    { id: 'order', label: '订购书籍', icon: ShoppingBag },
    { id: 'settings', label: '项目设置', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background-light">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  const currentProject = projects.find(p => p.id === currentProjectId);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-background-light overflow-hidden relative">
      {/* Project Switcher Dropdown (Global Portal-like) */}
      <AnimatePresence>
        {isProjectSwitcherOpen && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            <div
              className="absolute inset-0 z-40 pointer-events-auto"
              onClick={() => setIsProjectSwitcherOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-4 right-4 lg:left-8 lg:right-auto lg:w-64 top-16 lg:top-24 mt-2 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-100 py-2 z-50 pointer-events-auto"
              style={{ backgroundColor: 'rgba(255,255,255,0.98)' }}
            >
              <div className="px-4 py-2 border-b border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">切换项目</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setCurrentProjectId(project.id);
                      setIsProjectSwitcherOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left cursor-pointer ${currentProjectId === project.id ? 'bg-accent/5' : ''
                      }`}
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm mr-3 shrink-0 ${project.ownerId === currentUser?.id ? 'bg-accent/10 text-accent' : 'bg-blue-50 text-blue-500'
                      }`}>
                      {project.name[0]}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-sm font-medium truncate ${currentProjectId === project.id ? 'text-accent' : 'text-gray-700'
                        }`}>
                        {project.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {project.ownerId === currentUser?.id ? '我的项目' : '加入的项目'}
                      </p>
                    </div>
                    {currentProjectId === project.id && (
                      <div className="w-1.5 h-1.5 bg-accent rounded-full ml-2" />
                    )}
                  </button>
                ))}
              </div>
              <div className="px-2 pt-2 mt-2 border-t border-gray-50">
                <button
                  onClick={() => {
                    setCurrentView('settings');
                    setIsProjectSwitcherOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-xs font-bold text-gray-500 hover:text-accent transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 mr-2" />
                  管理所有项目
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Mobile Header */}
      <header className="lg:hidden bg-sidebar-dark text-white p-4 flex items-center justify-between z-30 shadow-md">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsProjectSwitcherOpen(!isProjectSwitcherOpen)}
            className="flex items-center space-x-2 text-left"
          >
            <h1 className="text-lg font-semibold tracking-wide">
              {projects.find(p => p.id === currentProjectId)?.name || '长生記'}
            </h1>
            <ChevronDown className={`w-4 h-4 transition-transform ${isProjectSwitcherOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView('account')}
            className="w-8 h-8 rounded-full overflow-hidden border border-white/20"
          >
            <img src={getAvatarUrl(currentUser)} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-sidebar-dark z-40 lg:hidden flex flex-col"
          >
            <div className="p-6 flex justify-between items-center border-b border-white/10">
              <h1 className="text-xl font-semibold">菜单</h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="cursor-pointer">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 text-primary rounded-full flex items-center justify-center font-bold text-xl">
                    {currentUser?.initials}
                  </div>
                  <div>
                    <div className="font-medium">{currentUser?.name}</div>
                    <div className="text-xs text-gray-400">
                      {projects.find(p => p.id === currentProjectId)?.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentView('account');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-sm bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                >
                  查看个人资料
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">更多选项</p>
                <button
                  onClick={() => {
                    setIsRecommendModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center p-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <Share2 className="w-5 h-5 mr-3" />
                  <span>推荐 Everstory</span>
                </button>
                <button
                  onClick={() => {
                    setIsGiftModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center p-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <Gift className="w-5 h-5 mr-3" />
                  <span>赠送 Everstory</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('settings');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center p-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <Settings className="w-5 h-5 mr-3" />
                  <span>项目设置</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-64 bg-sidebar-dark text-white flex-col h-full flex-shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-semibold tracking-wide">长生記</h1>
          <p className="text-sm text-gray-300 font-light">Everstory</p>
        </div>

        <div className="px-4 mb-6 relative">
          <button
            onClick={() => setIsProjectSwitcherOpen(!isProjectSwitcherOpen)}
            className="w-full bg-white/10 hover:bg-white/20 rounded-lg p-3 flex items-center justify-between transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 bg-green-100 text-primary rounded flex items-center justify-center font-bold text-lg shrink-0">
                {projects.find(p => p.id === currentProjectId)?.name[0] || currentUser?.initials}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-medium truncate">{currentUser?.name}</div>
                <div className="text-xs text-gray-300 truncate font-light">
                  {projects.find(p => p.id === currentProjectId)?.name}
                </div>
                <div className="text-[10px] text-gray-400 flex items-center mt-0.5">
                  <Users className="w-3 h-3 mr-1" />
                  <span>{projects.find(p => p.id === currentProjectId)?.members.length || 0} 位成员</span>
                </div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${isProjectSwitcherOpen ? 'rotate-180' : ''}`} />
          </button>

        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as ViewType);
                if (item.id === 'order') {
                  setIsOrdering(false);
                  setOrderBackToHome(false);
                }
              }}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors group cursor-pointer ${currentView === item.id
                ? 'bg-white/20 text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
            >
              <item.icon className={`mr-3 w-5 h-5 ${currentView === item.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 space-y-4 border-t border-white/10">
          <button
            onClick={() => setIsRecommendModalOpen(true)}
            className="w-full flex items-center p-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg group text-left cursor-pointer transition-colors"
          >
            <Share2 className="mr-3 w-5 h-5 opacity-70 group-hover:opacity-100 shrink-0" />
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="truncate">推荐 Everstory</span>
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0 ml-2"></div>
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 truncate">获得免费书籍积分</div>
            </div>
          </button>
          <button
            onClick={() => setIsGiftModalOpen(true)}
            className="w-full flex items-center p-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg group text-left cursor-pointer transition-colors"
          >
            <Gift className="mr-3 w-5 h-5 opacity-70 group-hover:opacity-100 shrink-0" />
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="truncate">赠送 Everstory</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 truncate">送给长辈最开心的礼物</div>
            </div>
          </button>
          <button
            onClick={() => setCurrentView('redemption')}
            className={`w-full flex items-center p-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg group text-left cursor-pointer transition-colors ${currentView === 'redemption' ? 'bg-white/10 text-white' : ''}`}
          >
            <Ticket className="mr-3 w-5 h-5 opacity-70 group-hover:opacity-100 shrink-0" />
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="truncate">兑换券</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity ml-2 shrink-0" />
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 truncate">使用兑换码增加积分</div>
            </div>
          </button>
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setCurrentView('account')}
            className={`w-full flex items-center space-x-3 text-gray-300 hover:text-white group text-left p-2 rounded-lg transition-colors cursor-pointer ${currentView === 'account' ? 'bg-white/10 text-white' : ''}`}
          >
            <img
              src={getAvatarUrl(currentUser)}
              alt="Profile"
              className="w-8 h-8 rounded-full border border-gray-500 object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="text-sm">账户设置</span>
            {currentUser?.is_premium && (
              <div className="flex items-center bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold">
                <Star className="w-2.5 h-2.5 mr-1 fill-amber-400" />
                高级
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto"
          >
            {(() => {
              const currentProject = projects.find(p => p.id === currentProjectId);
              const members = currentProject?.members || [];
              const membersCount = (currentProject?.members || []).length;

              return (
                <>
                  {currentView === 'home' && (
                    <HomeView
                      currentUser={currentUser}
                      stories={stories}
                      prompts={prompts}
                      membersCount={membersCount}
                      onNavigate={(view) => {
                        if (view === 'order') {
                          setIsOrdering(true);
                          setOrderBackToHome(true);
                        }
                        setCurrentView(view as ViewType);
                      }}
                      hasOrder={hasOrder}
                      onUpgrade={() => {
                        setUpgradeModalType('prompts');
                        setIsUpgradeModalOpen(true);
                      }}
                      onInvite={() => setIsInviteModalOpen(true)}
                      onStoryClick={(id) => {
                        setSelectedStoryId(id);
                        setCurrentView('story-detail');
                      }}
                      onPromptClick={(prompt) => {
                        setSelectedPrompt(prompt);
                        setCurrentView('recording');
                      }}
                      orders={orders}
                    />
                  )}
                  {currentView === 'stories' && (
                    <StoriesView
                      projectId={currentProjectId || ''}
                      stories={stories}
                      members={members}
                      hasOrder={hasOrder}
                      onShowUpgrade={() => {
                        setUpgradeModalType('stories');
                        setIsUpgradeModalOpen(true);
                      }}
                      onStoryClick={(id) => {
                        setSelectedStoryId(id);
                        setCurrentView('story-detail');
                      }}
                      onAddStory={() => setCurrentView('add-story')}
                    />
                  )}
                  {currentView === 'prompts' && (
                    <PromptsView
                      projectId={currentProjectId || ''}
                      prompts={prompts}
                      members={members}
                      hasOrder={hasOrder}
                      onShowUpgrade={() => {
                        setUpgradeModalType('prompts');
                        setIsUpgradeModalOpen(true);
                      }}
                      currentUserRole={(() => {
                        const project = projects.find(p => p.id === currentProjectId);
                        if (!project || !currentUser) return undefined;
                        if ((project.ownerId || (project as any).owner_id) === currentUser.id) return 'owner';
                        const member = project.members.find(m => (m.userId || (m as any).user_id || m.id) === currentUser.id);
                        return member?.projectRole || (member as any)?.role;
                      })()}
                      onPromptSaved={() => {
                        if (currentProjectId) fetchProjectData(currentProjectId);
                      }}
                      onPromptClick={(prompt) => {
                        if (!hasOrder && stories.length >= 2) {
                          setUpgradeModalType('story-limit');
                          setIsUpgradeModalOpen(true);
                          return;
                        }
                        setSelectedPrompt(prompt);
                        setCurrentView('recording');
                      }}
                    />
                  )}
                  {currentView === 'order' && (
                    isOrdering ? (
                      <OrderBookView
                        projectId={currentProjectId || ''}
                        stories={stories}
                        hasOrder={hasOrder}
                        onShowUpgrade={(type) => {
                          setUpgradeModalType(type || 'order-required');
                          setIsUpgradeModalOpen(true);
                        }}
                        onBack={() => {
                          if (orderBackToHome) {
                            setCurrentView('home');
                          }
                          setIsOrdering(false);
                          setOrderBackToHome(false);
                        }}
                        onComplete={() => {
                          setIsOrdering(false);
                          setCurrentView('home');
                          fetchProjectData(currentProjectId!);
                        }}
                      />
                    ) : (
                      <OrderTrackingView
                        onOrderClick={(id) => {
                          setSelectedOrderId(id);
                          setCurrentView('order-detail');
                        }}
                        onNewOrder={() => {
                          setIsOrdering(true);
                          setOrderBackToHome(false);
                        }}
                      />
                    )
                  )}
                  {currentView === 'buy-now' && (
                    <BuyNowView
                      projectId={currentProjectId || ''}
                      stories={stories}
                      onBack={() => setCurrentView('home')}
                      onComplete={() => {
                        if (currentProjectId) fetchProjectData(currentProjectId);
                        setCurrentView('order');
                      }}
                    />
                  )}
                </>
              );
            })()}
            {currentView === 'add-story' && currentProjectId && (
              <AddStoryView
                projectId={currentProjectId}
                onBack={() => setCurrentView('stories')}
                onSave={(story) => {
                  console.log('Saving story:', story);
                  if (currentProjectId) {
                    fetchProjectData(currentProjectId);
                  }
                  setCurrentView('stories');
                }}
              />
            )}
            {currentView === 'order-detail' && selectedOrderId && (
              <OrderDetailView
                order={orders.find(o => o.id === selectedOrderId)!}
                onBack={() => setCurrentView('order')}
              />
            )}
            {currentView === 'account-settings' && (
              <AccountSettingsView currentUser={currentUser} />
            )}
            {currentView === 'settings' && (
              <SettingsView
                hasOrder={hasOrder}
                onShowUpgrade={() => {
                  setUpgradeModalType('projects');
                  setIsUpgradeModalOpen(true);
                }}
                projects={projects}
                currentUser={currentUser}
                onProjectClick={(id) => {
                  setCurrentProjectId(id);
                  setCurrentView('home');
                }}
                onViewDetails={(id) => {
                  setProjectDetailId(id);
                  setCurrentView('project-detail');
                }}
                onProjectCreated={() => {
                  fetchUserData(session.user.id);
                }}
              />
            )}
            {currentView === 'project-detail' && projectDetailId && (
              <ProjectDetailView
                project={projects.find(p => p.id === projectDetailId)!}
                currentUser={currentUser}
                onBack={() => setCurrentView('settings')}
                onUpdate={() => {
                  fetchUserData(session.user.id);
                }}
              />
            )}
            {currentView === 'account' && (
              <AccountSettingsView currentUser={currentUser} />
            )}
            {currentView === 'story-detail' && selectedStoryId && stories.find(s => s.id === selectedStoryId) && (
              <StoryDetailView
                story={stories.find(s => s.id === selectedStoryId)!}
                onClose={() => setCurrentView('stories')}
                onUpdate={() => {
                  if (currentProjectId) fetchProjectData(currentProjectId);
                }}
                onDelete={() => {
                  if (currentProjectId) fetchProjectData(currentProjectId);
                }}
                currentUserRole={projects.find(p => p.id === currentProjectId)?.members.find(m => (m.userId || (m as any).user_id || m.id) === currentUser?.id)?.projectRole}
              />
            )}
            {currentView === 'recording' && selectedPrompt && currentProjectId && (
              <RecordingFlow
                projectId={currentProjectId}
                prompt={selectedPrompt}
                prompts={prompts}
                onSelectPrompt={setSelectedPrompt}
                onClose={() => setCurrentView('home')}
                onComplete={(data) => {
                  console.log('Recording complete:', data);
                  if (currentProjectId) {
                    fetchProjectData(currentProjectId);
                  }
                  if (data?.storyId) {
                    setSelectedStoryId(data.storyId);
                    setCurrentView('story-detail');
                  } else {
                    setCurrentView('stories');
                  }
                }}
              />
            )}
            {currentView === 'redemption' && (
              <RedemptionView
                onBack={() => setCurrentView('home')}
                onUpdate={() => {
                  if (session?.user?.id) fetchUserData(session.user.id, false);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>


        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden bg-white border-t border-gray-200 px-2 py-1 flex items-center justify-around z-30">
          {navItems.filter(item => item.id !== 'settings').map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as ViewType);
                if (item.id === 'order') {
                  setIsOrdering(false);
                  setOrderBackToHome(false);
                }
              }}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors cursor-pointer ${currentView === item.id
                ? 'text-primary'
                : 'text-gray-500'
                }`}
            >
              <item.icon className={`w-6 h-6 mb-1 ${currentView === item.id ? 'opacity-100' : 'opacity-70'}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center py-2 px-3 text-gray-500 cursor-pointer"
          >
            <Menu className="w-6 h-6 mb-1 opacity-70" />
            <span className="text-[10px] font-medium">更多</span>
          </button>
        </nav>
      </main>

      {/* Invitation Confirmation Modal */}
      <AnimatePresence>
        {pendingInviteProjectId && (
          <JoinConfirmationModal
            projectId={pendingInviteProjectId}
            onConfirm={async () => {
              if (currentUser && pendingInviteProjectId) {
                await databaseService.joinProject(pendingInviteProjectId, currentUser.id);
                // After joining, refresh projects and switch to it
                const updatedProjects = await databaseService.getProjects();
                setProjects(updatedProjects);
                setCurrentProjectId(pendingInviteProjectId);
                setPendingInviteProjectId(null);
                localStorage.removeItem('everstory-pending-invite');

                // Cleanup invitation in DB
                if (currentUser.email) await databaseService.deleteInvitation('email', currentUser.email);
                if (currentUser.phone) await databaseService.deleteInvitation('phone', currentUser.phone);
              }
            }}
            onCancel={() => {
              setPendingInviteProjectId(null);
              localStorage.removeItem('everstory-pending-invite');
            }}
          />
        )}
      </AnimatePresence>

      {/* Recommend Modal */}
      <AnimatePresence>
        {isRecommendModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-serif text-gray-800 mb-2">推荐 Everstory</h2>
                  <p className="text-sm text-gray-500">分享 Everstory 给您的朋友，当他们订购第一本书时，您将获得 50 元积分。</p>
                </div>
                <button onClick={() => setIsRecommendModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                <p className="text-xs text-gray-400 uppercase font-bold mb-2 tracking-wider">您的专属推荐链接</p>
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                  <span className="text-sm text-gray-600 truncate mr-4">https://everstory.com/ref/charlie-g</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://everstory.com/ref/charlie-g');
                      alert('链接已复制到剪贴板');
                    }}
                    className="text-primary text-sm font-bold hover:underline shrink-0"
                  >
                    复制
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsRecommendModalOpen(false)}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover transition shadow-md"
              >
                完成
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gift Modal */}
      <AnimatePresence>
        {isGiftModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-serif text-gray-800 mb-2">赠送 Everstory</h2>
                  <p className="text-sm text-gray-500">为其他 Everstory 账户充值，帮助他们记录珍贵回忆。</p>
                </div>
                <button onClick={() => setIsGiftModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">受赠人手机号</label>
                  <input
                    type="tel"
                    placeholder="输入手机号"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">充值金额</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['¥100', '¥200', '¥500'].map(amount => (
                      <button key={amount} className="py-3 border border-gray-200 rounded-xl hover:border-primary hover:text-primary transition font-medium">
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsGiftModalOpen(false)}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover transition shadow-md"
              >
                立即赠送
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgrade={() => setCurrentView('buy-now')}
        type={upgradeModalType}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={currentProjectId || ''}
        members={projects.find(p => p.id === currentProjectId)?.members || []}
        onMembersUpdate={() => {
          if (currentProjectId) fetchProjectData(currentProjectId);
        }}
      />
    </div>
  );
}

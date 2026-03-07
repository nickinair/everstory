import { Project, Story, Prompt, Order, ProjectMember } from '../types';

/**
 * Service for interacting with the Express Backend API.
 * Replaces Supabase with direct REST calls.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// --- JWT Helpers ---
const TOKEN_KEY = 'everstory-auth-token';
const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// --- Generic API Wrapper ---
async function apiRequest(path: string, options: RequestInit = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        clearToken();
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown API error' }));
        throw new Error(error.error || `API Error: ${response.statusText}`);
    }

    return response.json();
}

// --- Mock Helpers ---
const MOCK_PROJECTS_KEY = 'everstory-mock-projects';
const MOCK_STORIES_KEY = 'everstory-mock-stories';
const MOCK_PROMPTS_KEY = 'everstory-mock-prompts';
const MOCK_INTERACTIONS_KEY = 'everstory-mock-interactions';

const isMockUser = (userId?: string) => userId?.startsWith('mock-');
const getMockData = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const saveMockData = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

/**
 * Service for interacting with the backend API.
 */
export const databaseService = {
    // --- Auth ---
    async getSession() {
        const token = getToken();
        if (!token) return null;
        try {
            const data = await apiRequest('/api/auth/me');
            return { user: data.user, access_token: token };
        } catch (e) {
            return null;
        }
    },

    async login(identifier: string, password: string, type: 'phone' | 'email' = 'phone') {
        const body = type === 'phone' ? { phone: identifier, password } : { email: identifier, password };
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        if (data.token) {
            setToken(data.token);
        }
        return data;
    },

    async register(phone: string, password: string, fullName: string, code: string) {
        const data = await apiRequest('/api/auth/register-phone', {
            method: 'POST',
            body: JSON.stringify({ phone, password, fullName, code })
        });
        if (data.token) {
            setToken(data.token);
        }
        return data;
    },

    async registerEmail(email: string, password: string, fullName: string, code: string) {
        const data = await apiRequest('/api/auth/register-email', {
            method: 'POST',
            body: JSON.stringify({ email, password, fullName, code })
        });
        if (data.token) {
            setToken(data.token);
        }
        return data;
    },

    async sendOTP(identifier: string, type: 'phone' | 'email') {
        const endpoint = type === 'phone' ? '/api/sms/send-otp' : '/api/email/send-otp';
        const bodyKey = type === 'phone' ? 'phone' : 'email';
        return await apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ [bodyKey]: identifier })
        });
    },

    async logout() {
        clearToken();
    },

    async updatePhone(newPhone: string, code: string) {
        return await apiRequest('/api/auth/update-phone', {
            method: 'POST',
            body: JSON.stringify({ newPhone, code })
        });
    },

    async updateEmail(newEmail: string, code: string) {
        return await apiRequest('/api/auth/update-email', {
            method: 'POST',
            body: JSON.stringify({ newEmail, code })
        });
    },

    async updatePassword(password: string) {
        return await apiRequest('/api/auth/update-password', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
    },

    // --- Projects ---
    async getProjects() {
        const data = await apiRequest('/api/projects');
        return (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            ownerId: p.owner_id,
            createdAt: new Date(p.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
            members: (p.members || []).map((m: any) => ({
                id: m.id,
                userId: m.user_id,
                projectRole: m.role,
                name: m.full_name || m.phone || '未知用户',
                initials: (m.full_name || m.phone || '未').substring(0, 1),
                avatar: m.avatar_url,
                phone: m.phone,
                ...m
            }))
        })) as Project[];
    },

    async getProjectById(projectId: string) {
        if (!projectId) return null;
        if (projectId.startsWith('mock-')) {
            const projects = getMockData(MOCK_PROJECTS_KEY);
            return projects.find((p: any) => p.id === projectId);
        }
        try {
            const data = await apiRequest(`/api/projects/${projectId}`);
            return data;
        } catch (err) {
            console.error('Error fetching project by id:', err);
            return null;
        }
    },

    async createProject(name: string, description: string) {
        const data = await apiRequest('/api/projects', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            ownerId: data.owner_id,
            createdAt: new Date(data.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
            members: []
        } as Project;
    },

    async updateProject(projectId: string, updates: Partial<{ name: string; description: string }>) {
        if (projectId.startsWith('mock-')) {
            const projects = getMockData(MOCK_PROJECTS_KEY);
            const index = projects.findIndex((p: any) => p.id === projectId);
            if (index !== -1) {
                projects[index] = { ...projects[index], ...updates };
                saveMockData(MOCK_PROJECTS_KEY, projects);
                return projects[index];
            }
        }
        return await apiRequest(`/api/projects/${projectId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    },

    async deleteProject(projectId: string) {
        if (projectId.startsWith('mock-')) {
            const projects = getMockData(MOCK_PROJECTS_KEY);
            const filteredProjects = projects.filter((p: any) => p.id !== projectId);
            saveMockData(MOCK_PROJECTS_KEY, filteredProjects);
            return;
        }
        await apiRequest(`/api/projects/${projectId}`, { method: 'DELETE' });
    },

    // --- Stories ---
    async getStories(projectId: string) {
        if (projectId.startsWith('mock-')) {
            const stories = getMockData(MOCK_STORIES_KEY);
            return stories.filter((s: any) => s.projectId === projectId);
        }
        const data = await apiRequest(`/api/projects/${projectId}/stories`);
        return (data || []).map((s: any) => {
            const metadata = s.metadata || {};
            return {
                id: s.id,
                projectId: s.project_id,
                title: s.title,
                content: s.content,
                imageUrl: s.imageUrl || s.cover_url || s.image_url,
                videoUrl: s.audio_url || metadata.videoUrl,
                type: s.type,
                pages: s.pages,
                date: new Date(s.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
                metadata: metadata,
                additionalImages: metadata.additionalImages || [],
                promptId: s.prompt_id
            };
        }) as Story[];
    },

    async getStory(storyId: string) {
        if (storyId.startsWith('mock-')) {
            const stories = getMockData(MOCK_STORIES_KEY);
            return stories.find((s: any) => s.id === storyId) as Story;
        }
        const s = await apiRequest(`/api/stories/${storyId}`);
        const metadata = s.metadata || {};
        return {
            id: s.id,
            projectId: s.project_id,
            title: s.title,
            content: s.content,
            imageUrl: s.imageUrl || s.cover_url || s.image_url,
            videoUrl: s.audio_url || metadata.videoUrl,
            type: s.type,
            pages: s.pages,
            date: new Date(s.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
            metadata: metadata,
            additionalImages: metadata.additionalImages || [],
            promptId: s.prompt_id
        } as Story;
    },

    async createStory(projectId: string, story: Partial<Story>) {
        if (projectId.startsWith('mock-')) {
            const newStory = {
                id: 'mock-story-' + Date.now(),
                projectId,
                ...story,
                date: new Date().toLocaleDateString('zh-CN')
            };
            const stories = getMockData(MOCK_STORIES_KEY);
            stories.push(newStory);
            saveMockData(MOCK_STORIES_KEY, stories);
            return newStory as Story;
        }
        const data = await apiRequest(`/api/projects/${projectId}/stories`, {
            method: 'POST',
            body: JSON.stringify({
                ...story,
                image_url: story.imageUrl,
                cover_url: story.imageUrl,
                metadata: {
                    ...story.metadata,
                    additionalImages: story.additionalImages || []
                }
            })
        });
        return {
            ...data,
            imageUrl: data.imageUrl || data.cover_url || data.image_url,
            date: new Date(data.created_at).toLocaleDateString('zh-CN')
        } as Story;
    },

    async updateStory(storyId: string, updates: Partial<Story>) {
        if (storyId.startsWith('mock-')) {
            const stories = getMockData(MOCK_STORIES_KEY);
            const index = stories.findIndex((s: any) => s.id === storyId);
            if (index !== -1) {
                stories[index] = { ...stories[index], ...updates };
                saveMockData(MOCK_STORIES_KEY, stories);
                return stories[index] as Story;
            }
        }
        const data = await apiRequest(`/api/stories/${storyId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                ...updates,
                image_url: updates.imageUrl,
                cover_url: updates.imageUrl
            })
        });
        return {
            ...data,
            imageUrl: data.image_url || data.cover_url || data.imageUrl,
            date: new Date(data.created_at).toLocaleDateString('zh-CN')
        } as Story;
    },

    async deleteStory(storyId: string) {
        if (storyId.startsWith('mock-')) {
            const stories = getMockData(MOCK_STORIES_KEY);
            const filtered = stories.filter((s: any) => s.id !== storyId);
            saveMockData(MOCK_STORIES_KEY, filtered);
            return;
        }
        await apiRequest(`/api/stories/${storyId}`, { method: 'DELETE' });
    },

    // --- Prompts ---
    async getPrompts(projectId: string) {
        if (projectId.startsWith('mock-')) {
            return getMockData(MOCK_PROMPTS_KEY).filter((p: any) => p.projectId === projectId);
        }
        const data = await apiRequest(`/api/projects/${projectId}/prompts`);
        return (data || []).map((p: any) => ({
            id: p.id,
            question: p.question,
            imageUrl: p.image_url,
            status: p.status,
            category: p.category || '自定义',
            sentDate: new Date(p.sent_date).toLocaleDateString('zh-CN'),
            isRecorded: !!p.is_recorded,
            recordedDate: p.recorded_date ? new Date(p.recorded_date).toLocaleDateString('zh-CN') : undefined
        })) as Prompt[];
    },

    async createPrompt(projectId: string, question: string, category: string = '自定义', imageUrl?: string) {
        if (projectId.startsWith('mock-')) {
            const newPrompt = {
                id: 'mock-prompt-' + Date.now(),
                projectId,
                question,
                category,
                imageUrl,
                sentDate: new Date().toISOString()
            };
            const prompts = getMockData(MOCK_PROMPTS_KEY);
            prompts.push(newPrompt);
            saveMockData(MOCK_PROMPTS_KEY, prompts);
            return newPrompt as any;
        }
        return await apiRequest(`/api/projects/${projectId}/prompts`, {
            method: 'POST',
            body: JSON.stringify({ question, category, image_url: imageUrl })
        });
    },

    async updatePromptStatus(promptId: string, status: string) {
        if (promptId.startsWith('mock-')) {
            const prompts = getMockData(MOCK_PROMPTS_KEY);
            const index = prompts.findIndex((p: any) => p.id === promptId);
            if (index !== -1) {
                prompts[index].status = status;
                saveMockData(MOCK_PROMPTS_KEY, prompts);
            }
            return;
        }
        await apiRequest(`/api/prompts/${promptId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },

    async deletePrompt(promptId: string) {
        if (promptId.startsWith('mock-')) {
            const prompts = getMockData(MOCK_PROMPTS_KEY);
            const filtered = prompts.filter((p: any) => p.id !== promptId);
            saveMockData(MOCK_PROMPTS_KEY, filtered);
            return;
        }
        await apiRequest(`/api/prompts/${promptId}`, { method: 'DELETE' });
    },

    // --- Orders ---
    async getOrders(projectId: string) {
        return await apiRequest(`/api/projects/${projectId}/orders`);
    },

    async createOrder(projectId: string, orderData: Partial<Order>) {
        return await apiRequest(`/api/projects/${projectId}/orders`, {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    },

    // --- Members & Invitations ---
    async getProjectMembers(projectId: string) {
        if (projectId.startsWith('mock-')) {
            const projects = getMockData(MOCK_PROJECTS_KEY);
            const project = projects.find((p: any) => p.id === projectId);
            return project ? project.members : [];
        }
        return await apiRequest(`/api/projects/${projectId}/members`);
    },

    async createInvitation(projectId: string, email?: string, phone?: string) {
        if (projectId.startsWith('mock-')) {
            const invites = getMockData('everstory-mock-invitations');
            invites.push({ projectId, email, phone });
            saveMockData('everstory-mock-invitations', invites);
            return { success: true };
        }
        return await apiRequest(`/api/projects/${projectId}/invitations`, {
            method: 'POST',
            body: JSON.stringify({ email, phone })
        });
    },

    async deleteInvitation(projectId: string, identifier: string) {
        if (projectId.startsWith('mock-')) {
            const invites = getMockData('everstory-mock-invitations');
            const filtered = invites.filter((inv: any) =>
                inv.projectId !== projectId || (inv.email !== identifier && inv.phone !== identifier)
            );
            saveMockData('everstory-mock-invitations', filtered);
            return;
        }
        return await apiRequest(`/api/projects/${projectId}/invitations/${encodeURIComponent(identifier)}`, {
            method: 'DELETE'
        });
    },

    async checkInvitations(userId: string, identifier: string) {
        const isEmail = identifier.includes('@');
        const normalizePhone = (p: string) => p.replace(/\D/g, '');
        const normalizedIdentifier = isEmail ? identifier.trim().toLowerCase() : normalizePhone(identifier);

        const mockInvites = getMockData('everstory-mock-invitations');
        const matching = mockInvites.filter((inv: any) => {
            const invEmail = inv.email?.trim().toLowerCase();
            const invPhone = inv.phone ? normalizePhone(inv.phone) : '';
            return isEmail ? invEmail === normalizedIdentifier : invPhone === normalizedIdentifier;
        });

        for (const invite of matching) {
            await this.joinProject(invite.projectId, userId);
        }

        saveMockData('everstory-mock-invitations', mockInvites.filter((inv: any) => {
            const invEmail = inv.email?.trim().toLowerCase();
            const invPhone = inv.phone ? normalizePhone(inv.phone) : '';
            return isEmail ? invEmail !== normalizedIdentifier : invPhone !== normalizedIdentifier;
        }));
    },

    async joinProject(projectId: string, userId: string) {
        if (projectId.startsWith('mock-')) {
            const projects = getMockData(MOCK_PROJECTS_KEY);
            const project = projects.find((p: any) => p.id === projectId);
            if (project && !project.members.some((m: any) => m.userId === userId)) {
                project.members.push({ id: 'member-' + Date.now(), userId, role: 'collaborator' });
                saveMockData(MOCK_PROJECTS_KEY, projects);
            }
            return;
        }
        return await apiRequest(`/api/projects/${projectId}/join`, { method: 'POST' });
    },

    async updateMemberRole(projectId: string, memberId: string, role: string) {
        if (projectId.startsWith('mock-')) {
            const projects = getMockData(MOCK_PROJECTS_KEY);
            const project = projects.find((p: any) => p.id === projectId);
            if (project) {
                const member = project.members.find((m: any) => m.id === memberId);
                if (member) {
                    member.role = role;
                    saveMockData(MOCK_PROJECTS_KEY, projects);
                }
            }
        }
    },

    async ensureDefaultProject(userId: string, displayName: string) {
        try {
            const projects = await this.getProjects();
            if (projects.length === 0) {
                const projectName = `${displayName}的故事`.replace(/\+86/g, '');
                await this.createProject(projectName, '我的第一个长生記项目');
            }
        } catch (e) {
            console.error('Error ensuring default project:', e);
        }
    },

    async syncProfile(userId: string, data: any) {
        // Handled by registration/me on backend
    },

    // --- Points System ---
    async getPoints() {
        try {
            const data = await apiRequest('/api/auth/me');
            return data.user?.points || 0;
        } catch (e) {
            return 0;
        }
    },

    async getPointTransactions() {
        return await apiRequest('/api/points/transactions');
    },

    async redeemCoupon(code: string) {
        return await apiRequest('/api/points/redeem', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    },

    async spendPoints(amount: number, description: string) {
        return await apiRequest('/api/points/spend', {
            method: 'POST',
            body: JSON.stringify({ amount, description })
        });
    },

    // --- Interactions ---
    async getStoryInteractions(storyId: string) {
        if (storyId.startsWith('mock-')) {
            const interactions = getMockData(MOCK_INTERACTIONS_KEY);
            return interactions.filter((i: any) => i.storyId === storyId);
        }
        const data = await apiRequest(`/api/stories/${storyId}/interactions`);
        return (data || []).map((i: any) => ({
            id: i.id,
            storyId: i.story_id,
            userId: i.user_id,
            userName: i.full_name || i.phone || '未知用户',
            userAvatar: i.avatar_url,
            type: i.type,
            content: i.content,
            createdAt: i.created_at
        }));
    },

    async addStoryInteraction(storyId: string, type: 'like' | 'reaction', content?: string) {
        if (storyId.startsWith('mock-')) {
            const interactions = getMockData(MOCK_INTERACTIONS_KEY);
            const newInteraction = {
                id: 'mock-int-' + Date.now(),
                storyId,
                type,
                content,
                createdAt: new Date().toISOString()
            };
            interactions.push(newInteraction);
            saveMockData(MOCK_INTERACTIONS_KEY, interactions);
            return newInteraction;
        }
        return await apiRequest(`/api/stories/${storyId}/interactions`, {
            method: 'POST',
            body: JSON.stringify({ type, content })
        });
    },

    async getProjectInteractionHistory(projectId: string) {
        if (projectId.startsWith('mock-')) {
            return getMockData(MOCK_INTERACTIONS_KEY);
        }
        const data = await apiRequest(`/api/projects/${projectId}/interactions`);
        return (data || []).map((i: any) => ({
            id: i.id,
            storyId: i.story_id,
            storyTitle: i.story_title,
            userId: i.user_id,
            userName: i.full_name || i.phone || '未知用户',
            userAvatar: i.avatar_url,
            type: i.type,
            content: i.content,
            createdAt: i.created_at
        }));
    },

    async getProjectInvitations(projectId: string) {
        if (projectId.startsWith('mock-')) return [];
        return await apiRequest(`/api/projects/${projectId}/invitations`);
    },

    async sendInvitation(projectId: string, email?: string, phone?: string) {
        if (projectId.startsWith('mock-')) return { success: true };
        return await apiRequest(`/api/projects/${projectId}/invitations`, {
            method: 'POST',
            body: JSON.stringify({ email, phone })
        });
    },

    // --- Storage ---
    async getUploadUrl(fileName: string, fileType: string) {
        return await apiRequest('/api/storage/upload-url', {
            method: 'POST',
            body: JSON.stringify({ fileName, fileType })
        });
    },

    async uploadFile(base64Data: string, fileName: string, fileType: string) {
        return await apiRequest('/api/storage/upload', {
            method: 'POST',
            body: JSON.stringify({ base64Data, fileName, fileType })
        });
    },

    async uploadMedia(file: File | Blob, path: string, contentType?: string): Promise<string> {
        // Compatibility wrapper: convert File/Blob to base64 and use uploadFile
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64Data = (reader.result as string).split(',')[1];
                    const fileName = path.split('/').pop() || 'file';
                    const fileType = contentType || (file instanceof File ? file.type : 'application/octet-stream');
                    const result = await this.uploadFile(base64Data, fileName, fileType);
                    resolve(result.url);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    async uploadPhoto(projectId: string, file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `prompts/${projectId}/${fileName}`;
        return await this.uploadMedia(file, filePath);
    },

    async downloadMedia(url: string) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch media: ${response.statusText}`);
        return await response.blob();
    },

    getCurrentUserId() {
        const token = getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id || payload.sub;
        } catch (e) {
            return null;
        }
    }
};

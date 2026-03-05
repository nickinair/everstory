import { supabase } from '../lib/supabaseClient';
import { Project, Story, Prompt, Order, ProjectMember } from '../types';

/**
 * Service for interacting with the Supabase database.
 * Syncs all application data including projects, stories, prompts, and orders.
 */
// --- Mock Helpers ---
const MOCK_PROJECTS_KEY = 'everstory-mock-projects';
const MOCK_STORIES_KEY = 'everstory-mock-stories';
const MOCK_PROMPTS_KEY = 'everstory-mock-prompts';

const isMockUser = (userId?: string) => userId?.startsWith('mock-');

const getMockData = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const saveMockData = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

/**
 * Service for interacting with the Supabase database.
 * Syncs all application data including projects, stories, prompts, and orders.
 */
export const databaseService = {
    // --- Auth ---
    async getSession() {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    },

    // --- Projects ---
    async getProjects() {
        const { data: { user } } = await supabase.auth.getUser();
        if (isMockUser(user?.id)) {
            console.log('DatabaseService: Returning mock projects');
            return getMockData(MOCK_PROJECTS_KEY);
        }

        const { data, error } = await supabase
            .from('projects')
            .select(`
        *,
        members:project_members(
          *,
          user:profiles(*)
        )
      `);

        if (error) throw error;
        return (data || []).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            ownerId: p.owner_id,
            createdAt: new Date(p.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
            members: (p.members || []).map((m: any) => ({
                id: m.id,
                userId: m.user_id,
                projectRole: m.role,
                name: m.user?.full_name || m.user?.phone || '未知用户',
                initials: (m.user?.full_name || m.user?.phone || '未').substring(0, 1),
                avatar: m.user?.avatar_url || m.user?.avatar,
                phone: m.user?.phone,
                user: m.user,
                ...m.user
            }))
        })) as Project[];
    },

    async getProjectById(projectId: string) {
        if (isMockUser(projectId)) {
            const projects = getMockData(MOCK_PROJECTS_KEY);
            return projects.find((p: any) => p.id === projectId);
        }

        // Use the RPC function to bypass RLS for previewing basic project info
        const { data, error } = await supabase
            .rpc('get_project_preview', { p_id: projectId });

        if (error) {
            console.error('Error in get_project_preview RPC:', error);
            // Fallback to normal select if RPC fails or is not yet migrated
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('projects')
                .select(`
                    *,
                    owner:profiles(*)
                `)
                .eq('id', projectId)
                .maybeSingle();

            if (fallbackError) throw fallbackError;
            if (!fallbackData) return null;
            return {
                id: fallbackData.id,
                name: fallbackData.name,
                description: fallbackData.description,
                ownerId: fallbackData.owner_id,
                ownerName: fallbackData.owner?.full_name || '未知主人',
                createdAt: new Date(fallbackData.created_at).toLocaleDateString('zh-CN')
            };
        }

        return data; // RPC returns the JSON object directly (or null)
    },

    async createProject(name: string, description: string) {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('DatabaseService.createProject - Current User:', user?.id);

        if (!user) {
            console.error('DatabaseService.createProject - No user found in session');
            throw new Error('User not authenticated');
        }

        if (isMockUser(user.id)) {
            console.log('DatabaseService: Creating mock project');
            const newProject = {
                id: 'mock-proj-' + Date.now(),
                name,
                description,
                owner_id: user.id,
                ownerId: user.id,
                createdAt: new Date().toLocaleDateString('zh-CN'),
                members: [{
                    id: 'mock-mem-' + Date.now(),
                    project_id: 'mock-proj-' + Date.now(),
                    user_id: user.id,
                    role: 'owner',
                    projectRole: 'owner',
                    user: {
                        id: user.id,
                        full_name: user.user_metadata?.full_name || 'Guest',
                        phone: user.user_metadata?.phone || 'N/A'
                    }
                }]
            };
            const projects = getMockData(MOCK_PROJECTS_KEY);
            projects.push(newProject);
            saveMockData(MOCK_PROJECTS_KEY, projects);
            return newProject;
        }

        const { data, error } = await supabase
            .from('projects')
            .insert({ name, description, owner_id: user.id })
            .select()
            .single();

        if (error) throw error;

        // Add owner as a member
        await supabase.from('project_members').insert({
            project_id: data.id,
            user_id: user.id,
            role: 'owner'
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
        if (isMockUser(projectId)) {
            const projects = getMockData(MOCK_PROJECTS_KEY);
            const index = projects.findIndex((p: any) => p.id === projectId);
            if (index !== -1) {
                projects[index] = { ...projects[index], ...updates };
                saveMockData(MOCK_PROJECTS_KEY, projects);
                return projects[index];
            }
        }

        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteProject(projectId: string) {
        if (isMockUser(projectId)) {
            // Delete project
            const projects = getMockData(MOCK_PROJECTS_KEY);
            const filteredProjects = projects.filter((p: any) => p.id !== projectId);
            saveMockData(MOCK_PROJECTS_KEY, filteredProjects);

            // Delete associated stories
            const stories = getMockData(MOCK_STORIES_KEY);
            const filteredStories = stories.filter((s: any) => s.projectId !== projectId);
            saveMockData(MOCK_STORIES_KEY, filteredStories);

            // Delete associated prompts
            const prompts = getMockData(MOCK_PROMPTS_KEY);
            const filteredPrompts = prompts.filter((p: any) => p.projectId !== projectId);
            saveMockData(MOCK_PROMPTS_KEY, filteredPrompts);

            // Invitations are also in local storage but keyed by name, we can clear them globally or filter
            const MOCK_INVITES_KEY = 'everstory-mock-invitations';
            const invites = JSON.parse(localStorage.getItem(MOCK_INVITES_KEY) || '[]');
            const filteredInvites = invites.filter((inv: any) => inv.projectId !== projectId);
            localStorage.setItem(MOCK_INVITES_KEY, JSON.stringify(filteredInvites));

            return;
        }

        // Real data deletion (cascades should be handled by DB, but we do it explicitly for safety if FKs aren't set to cascade)
        // 1. Stories
        await supabase.from('stories').delete().eq('project_id', projectId);
        // 2. Prompts
        await supabase.from('prompts').delete().eq('project_id', projectId);
        // 3. Orders (some orders might be linked, clear them)
        await supabase.from('orders').delete().eq('project_id', projectId);
        // 4. Invitations
        await supabase.from('project_invitations').delete().eq('project_id', projectId);
        // 5. Members
        await supabase.from('project_members').delete().eq('project_id', projectId);
        // 6. Finally, the project itself
        const { error } = await supabase.from('projects').delete().eq('id', projectId);

        if (error) throw error;
    },

    // --- Stories ---
    async getStories(projectId: string) {
        if (isMockUser(projectId)) {
            const stories = getMockData(MOCK_STORIES_KEY);
            return stories.filter((s: any) => s.projectId === projectId);
        }

        const { data, error } = await supabase
            .from('stories')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(s => {
            const metadata = s.metadata || {};
            // If it's a video and imageUrl is actually the video file, 
            // ensure we have videoUrl set.
            let videoUrl = metadata.videoUrl || (s.type === 'video' ? s.image_url : undefined);
            let imageUrl = s.image_url;

            // Simple heuristic/regex: if image_url points to a video file, it's not a proper cover image
            const isVideoFile = imageUrl?.match(/\.(webm|mp4|mov|avi|m4v|3gp|mkv)($|\?)/i);
            if (isVideoFile && s.type === 'video') {
                videoUrl = imageUrl;
                imageUrl = metadata.coverUrl || metadata.imageUrl || ''; // Use custom cover if exists
            }

            return {
                id: s.id,
                projectId: s.project_id,
                title: s.title,
                content: s.content,
                imageUrl: imageUrl,
                videoUrl: videoUrl,
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

        const { data, error } = await supabase
            .from('stories')
            .select('*')
            .eq('id', storyId)
            .single();

        if (error) throw error;

        const s = data;
        const metadata = s.metadata || {};
        // Strict video detection: only fall back to image_url if it's actually a video file
        const isVideoFile = s.image_url?.match(/\.(webm|mp4|mov|avi|m4v|3gp|mkv)($|\?)/i);
        let videoUrl = metadata.videoUrl;

        if (!videoUrl && isVideoFile && s.type === 'video') {
            videoUrl = s.image_url;
        }

        let imageUrl = s.image_url;
        // If image_url was actually a video file used as the source, use coverUrl/imageUrl from metadata if available
        if (isVideoFile && s.type === 'video') {
            imageUrl = metadata.coverUrl || metadata.imageUrl || '';
        }

        return {
            id: s.id,
            projectId: s.project_id,
            title: s.title,
            content: s.content,
            imageUrl: imageUrl,
            videoUrl: videoUrl,
            type: s.type,
            pages: s.pages,
            date: new Date(s.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
            metadata: metadata,
            additionalImages: metadata.additionalImages || [],
            promptId: s.prompt_id
        } as Story;
    },

    async createStory(projectId: string, story: Partial<Story>) {
        if (isMockUser(projectId)) {
            const newStory = {
                id: 'mock-story-' + Date.now(),
                projectId,
                title: story.title,
                content: story.content,
                imageUrl: story.imageUrl,
                videoUrl: story.videoUrl,
                type: story.type,
                pages: story.pages || 1,
                date: new Date().toLocaleDateString('zh-CN'),
                metadata: {
                    ...story.metadata,
                    videoUrl: story.videoUrl
                },
                promptId: story.promptId
            };
            const stories = getMockData(MOCK_STORIES_KEY);
            stories.push(newStory);
            saveMockData(MOCK_STORIES_KEY, stories);
            return newStory as Story;
        }

        const metadata = {
            ...story.metadata,
            videoUrl: story.videoUrl
        };

        const { data, error } = await supabase
            .from('stories')
            .insert({
                project_id: projectId,
                title: story.title,
                content: story.content,
                image_url: story.imageUrl,
                type: story.type,
                pages: story.pages || 1,
                metadata: metadata,
                prompt_id: story.promptId
            })
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            projectId: data.project_id,
            title: data.title,
            content: data.content,
            imageUrl: data.image_url,
            videoUrl: data.metadata?.videoUrl,
            type: data.type,
            pages: data.pages,
            date: new Date(data.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
            metadata: data.metadata
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

        // 1. Fetch current story to get existing metadata to avoid wiping it
        const { data: current, error: fetchError } = await supabase
            .from('stories')
            .select('*')
            .eq('id', storyId)
            .single();

        if (fetchError) throw fetchError;

        const metadata = {
            ...(current.metadata || {}),
            ...(updates.metadata || {})
        };
        if (updates.videoUrl) metadata.videoUrl = updates.videoUrl;

        const updatePayload: any = {};
        if (updates.title !== undefined) updatePayload.title = updates.title;
        if (updates.content !== undefined) updatePayload.content = updates.content;
        if (updates.imageUrl !== undefined) updatePayload.image_url = updates.imageUrl;
        if (updates.type !== undefined) updatePayload.type = updates.type;
        if (updates.pages !== undefined) updatePayload.pages = updates.pages;
        if (updates.promptId !== undefined) updatePayload.prompt_id = updates.promptId;
        updatePayload.metadata = metadata;

        const { data, error } = await supabase
            .from('stories')
            .update(updatePayload)
            .eq('id', storyId)
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            projectId: data.project_id,
            title: data.title,
            content: data.content,
            imageUrl: data.image_url,
            videoUrl: data.metadata?.videoUrl,
            type: data.type,
            pages: data.pages,
            date: new Date(data.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
            metadata: data.metadata
        } as Story;
    },

    async deleteStory(storyId: string) {
        if (storyId.startsWith('mock-')) {
            const stories = getMockData(MOCK_STORIES_KEY);
            const filtered = stories.filter((s: any) => s.id !== storyId);
            saveMockData(MOCK_STORIES_KEY, filtered);
            return;
        }

        const { error } = await supabase
            .from('stories')
            .delete()
            .eq('id', storyId);

        if (error) throw error;
    },

    // --- Prompts ---
    async getPrompts(projectId: string) {
        if (isMockUser(projectId)) {
            return getMockData(MOCK_PROMPTS_KEY).filter((p: any) => p.projectId === projectId);
        }

        // Fetch prompts
        const { data: promptsData, error: promptsError } = await supabase
            .from('prompts')
            .select('*')
            .eq('project_id', projectId)
            .order('sent_date', { ascending: true });

        if (promptsError) throw promptsError;

        // Fetch stories for this project to check fulfillment, including created_at for recorded date
        const { data: storiesData, error: storiesError } = await supabase
            .from('stories')
            .select('prompt_id, created_at')
            .eq('project_id', projectId)
            .not('prompt_id', 'is', null);

        if (storiesError) throw storiesError;

        // Map promptId -> recorded date
        const recordedMap = new Map<string, string>();
        for (const s of storiesData || []) {
            if (s.prompt_id && !recordedMap.has(s.prompt_id)) {
                recordedMap.set(
                    s.prompt_id,
                    new Date(s.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
                );
            }
        }

        return (promptsData || []).map(p => ({
            id: p.id,
            question: p.question,
            imageUrl: p.image_url,
            status: p.status,
            category: p.category || '自定义',
            sentDate: new Date(p.sent_date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
            isRecorded: recordedMap.has(p.id),
            recordedDate: recordedMap.get(p.id)
        })) as Prompt[];
    },

    async createPrompt(projectId: string, question: string, category: string = '自定义', imageUrl?: string) {
        if (isMockUser(projectId)) {
            const newPrompt = {
                id: 'mock-prompt-' + Date.now(),
                projectId,
                question: question,
                category: category,
                imageUrl: imageUrl || 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=400',
                status: 'sent',
                sentDate: new Date().toLocaleDateString('zh-CN')
            };
            const prompts = getMockData(MOCK_PROMPTS_KEY);
            prompts.push(newPrompt);
            saveMockData(MOCK_PROMPTS_KEY, prompts);
            return newPrompt as Prompt;
        }

        const { data, error } = await supabase
            .from('prompts')
            .insert({
                project_id: projectId,
                question: question,
                category: category,
                image_url: imageUrl || 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=400',
                status: 'sent',
                sent_date: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            question: data.question,
            imageUrl: data.image_url,
            status: data.status,
            category: data.category || '自定义',
            sentDate: new Date(data.sent_date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
        } as Prompt;
    },

    async updatePromptStatus(promptId: string, status: 'sent' | 'draft') {
        if (promptId.startsWith('mock-')) {
            const prompts = getMockData(MOCK_PROMPTS_KEY);
            const index = prompts.findIndex((p: any) => p.id === promptId);
            if (index !== -1) {
                prompts[index].status = status;
                saveMockData(MOCK_PROMPTS_KEY, prompts);
                return;
            }
        }

        const { error } = await supabase
            .from('prompts')
            .update({ status })
            .eq('id', promptId);

        if (error) throw error;
    },

    async deletePrompt(promptId: string) {
        if (promptId.startsWith('mock-')) {
            const prompts = getMockData(MOCK_PROMPTS_KEY);
            const filtered = prompts.filter((p: any) => p.id !== promptId);
            saveMockData(MOCK_PROMPTS_KEY, filtered);
            return;
        }

        const { error } = await supabase
            .from('prompts')
            .delete()
            .eq('id', promptId);

        if (error) throw error;
    },

    // --- Orders ---
    async getOrders(projectId: string) {
        if (isMockUser(projectId)) {
            return []; // Orders not mocked for now
        }
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        logistics:order_logistics(*)
      `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Order[];
    },

    async createOrder(projectId: string, orderData: Partial<Order>) {
        if (isMockUser(projectId)) {
            return { id: 'mock-order-' + Date.now(), ...orderData };
        }
        const { data: { user } } = await supabase.auth.getUser();

        // Generate a reference ID if not provided
        const id = orderData.id || `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

        const { data, error } = await supabase
            .from('orders')
            .insert({
                id,
                project_id: projectId,
                user_id: user?.id,
                book_title: orderData.bookTitle,
                book_subtitle: orderData.bookSubtitle,
                book_author: orderData.bookAuthor,
                cover_color: orderData.coverColor,
                image_url: orderData.imageUrl,
                status: orderData.status || 'processing',
                price: orderData.price,
                recipient_name: orderData.recipientName,
                contact_phone: orderData.contactPhone,
                shipping_address: orderData.shippingAddress
            })
            .select()
            .single();

        if (error) throw error;

        // If order is successful, set user as premium
        if (data && data.status === 'processing') {
            await supabase
                .from('profiles')
                .update({ is_premium: true })
                .eq('id', user?.id);
        }

        return data;
    },

    // --- Storage ---
    async uploadMedia(file: File | Blob, path: string, contentType?: string) {
        if (path.includes('mock-') || isMockUser(path)) {
            return URL.createObjectURL(file);
        }

        const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(path, file, {
                upsert: true,
                contentType: contentType || (file instanceof File ? file.type : undefined)
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(path);

        return publicUrl;
    },

    async uploadPhoto(projectId: string, file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `prompts/${projectId}/${fileName}`;

        return await this.uploadMedia(file, filePath);
    },

    async downloadMedia(url: string) {
        // If it's a Supabase storage URL, try to download via storage API for better reliability/CORS
        if (url.includes('.supabase.co/storage/v1/object/public/media/')) {
            const path = url.split('/public/media/')[1];
            if (path) {
                const { data, error } = await supabase.storage
                    .from('media')
                    .download(path);
                if (!error && data) return data;
                console.warn('Supabase download failed, falling back to fetch:', error);
            }
        }

        // Fallback to standard fetch
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch media: ${response.statusText}`);
        return await response.blob();
    },

    // --- Invitations ---
    async sendInvitation(projectId: string, identifier: string, options?: { inviterName?: string; projectTitle?: string }) {
        console.log(`DatabaseService: Sending invitation to ${identifier} for project ${projectId}`);
        const MOCK_INVITES_KEY = 'everstory-mock-invitations';
        const isEmail = identifier.includes('@');

        const normalizePhone = (p: string) => {
            const clean = p.replace(/\D/g, '');
            return clean.length === 11 ? `+86${clean}` : (clean.startsWith('86') && clean.length === 13 ? `+${clean}` : p);
        };

        const normalizedIdentifier = isEmail ? identifier.trim().toLowerCase() : normalizePhone(identifier);

        const getMockInvites = () => {
            const data = localStorage.getItem(MOCK_INVITES_KEY);
            return data ? JSON.parse(data) : [];
        };

        const saveMockInvites = (invites: { phone?: string; email?: string; projectId: string }[]) => {
            localStorage.setItem(MOCK_INVITES_KEY, JSON.stringify(invites));
        };

        if (isMockUser(projectId)) {
            const invites = getMockInvites();
            if (!invites.some((inv: any) => (isEmail ? inv.email === identifier : inv.phone === identifier) && inv.projectId === projectId)) {
                invites.push({ [isEmail ? 'email' : 'phone']: identifier, projectId });
                saveMockInvites(invites);
            }
            return;
        }

        try {
            // Use select to check if exists or insert with specific handling
            const { error } = await supabase.from('project_invitations').insert({
                project_id: projectId,
                [isEmail ? 'email' : 'phone']: normalizedIdentifier
            });

            if (error) {
                if (error.code === '23505') {
                    console.log('DatabaseService: Invitation already exists, skipping insert.');
                } else {
                    console.warn('Database insert error (ignoring to allow email send):', error);
                }
            }

            // Trigger Email if applicable
            if (isEmail) {
                console.log(`DatabaseService: Triggering email for ${identifier}`);
                let inviter = options?.inviterName;
                let title = options?.projectTitle;

                // Better to fetch if not provided
                if (!inviter || !title) {
                    const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single();
                    if (project) title = project.name;

                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                        inviter = profile?.full_name || user.user_metadata?.full_name || user.email;
                    }
                }

                // Use the custom Node.js Express server instead of Supabase Edge Functions
                const apiUrl = import.meta.env.VITE_API_URL || '';
                const response = await fetch(`${apiUrl}/api/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: identifier,
                        projectId,
                        inviterName: inviter,
                        projectTitle: title
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Email API error details: ${errorText}`);
                    throw new Error(`Email API failed: ${response.statusText}`);
                }

                console.log(`DatabaseService: Email sent successfully to ${identifier}`);
            }
        } catch (e) {
            console.error('Error in sendInvitation:', e);
            // Fallback for missing table
            const invites = getMockInvites();
            if (!invites.some((inv: any) => (isEmail ? inv.email === identifier : inv.phone === identifier) && inv.projectId === projectId)) {
                invites.push({ [isEmail ? 'email' : 'phone']: identifier, projectId });
                saveMockInvites(invites);
            }
        }
    },

    async checkAndProcessInvitations(userId: string, identifier: string) {
        console.log(`DatabaseService: Checking invitations for ${identifier}`);
        const MOCK_INVITES_KEY = 'everstory-mock-invitations';
        const isEmail = identifier.includes('@');

        const normalizePhone = (p: string) => {
            const clean = p.replace(/\D/g, '');
            if (clean.length === 11) return `+86${clean}`;
            if (clean.startsWith('86') && clean.length === 13) return `+${clean}`;
            return p;
        };

        // Normalize identifier
        const normalizedIdentifier = isEmail ? identifier.trim().toLowerCase() : normalizePhone(identifier);

        const getMockInvites = () => {
            const data = localStorage.getItem(MOCK_INVITES_KEY);
            return data ? JSON.parse(data) : [];
        };

        const saveMockInvites = (invites: { phone?: string; email?: string; projectId: string }[]) => {
            localStorage.setItem(MOCK_INVITES_KEY, JSON.stringify(invites));
        };

        // 1. Mock
        const mockInvites = getMockInvites();
        const matching = mockInvites.filter((inv: any) => {
            const invEmail = inv.email?.trim().toLowerCase();
            const invPhone = inv.phone?.trim();
            return isEmail ? invEmail === normalizedIdentifier : invPhone === normalizedIdentifier;
        });

        for (const invite of matching) {
            await this.joinProject(invite.projectId, userId);
        }

        // Remove processed mock invites
        saveMockInvites(mockInvites.filter((inv: any) => {
            const invEmail = inv.email?.trim().toLowerCase();
            const invPhone = inv.phone?.trim();
            return isEmail ? invEmail !== normalizedIdentifier : invPhone !== normalizedIdentifier;
        }));

        // 2. Real - Check BOTH phone and email if available from profile
        try {
            // First, get full profile to have both identifiers
            const { data: profile } = await supabase.from('profiles').select('email, phone').eq('id', userId).maybeSingle();

            const identifiers = [];
            if (profile?.email) identifiers.push({ field: 'email', value: profile.email.toLowerCase() });
            if (profile?.phone) identifiers.push({ field: 'phone', value: profile.phone });
            // Add the current identifier used for login if not already there
            if (!identifiers.some(i => i.value === normalizedIdentifier)) {
                identifiers.push({ field: isEmail ? 'email' : 'phone', value: normalizedIdentifier });
            }

            for (const idObj of identifiers) {
                const { data: realInvites } = await (supabase
                    .from('project_invitations') as any)
                    .select('project_id')
                    .eq(idObj.field, idObj.value);

                if (realInvites && realInvites.length > 0) {
                    console.log(`DatabaseService: Found ${realInvites.length} real invitations for ${idObj.value}`);
                    for (const inv of realInvites) {
                        await this.joinProject(inv.project_id, userId);
                    }
                    // Delete processed invitations
                    await this.deleteInvitation(idObj.field, idObj.value);
                }
            }
        } catch (e) {
            console.error('DatabaseService: Error checking real invitations:', e);
        }
    },

    async deleteInvitation(field: 'email' | 'phone', value: string) {
        try {
            await (supabase.from('project_invitations') as any).delete().eq(field, value);
        } catch (e) {
            console.error('Error deleting invitation:', e);
        }
    },

    async getProjectInvitations(projectId: string) {
        if (isMockUser(projectId)) {
            const MOCK_INVITES_KEY = 'everstory-mock-invitations';
            const data = localStorage.getItem(MOCK_INVITES_KEY);
            const invites = data ? JSON.parse(data) : [];
            return invites.filter((inv: any) => inv.projectId === projectId);
        }

        try {
            const { data } = await (supabase.from('project_invitations') as any)
                .select('phone, email')
                .eq('project_id', projectId);
            return data || [];
        } catch (e) {
            const MOCK_INVITES_KEY = 'everstory-mock-invitations';
            const data = localStorage.getItem(MOCK_INVITES_KEY);
            const invites = data ? JSON.parse(data) : [];
            return invites.filter((inv: any) => inv.projectId === projectId);
        }
    },

    async joinProject(projectId: string, userId: string) {
        console.log(`DatabaseService: User ${userId} joining project ${projectId}`);
        if (projectId.includes('mock-')) {
            const projects = getMockData(MOCK_PROJECTS_KEY);
            const project = projects.find((p: any) => p.id === projectId);
            if (project && !project.members.some((m: any) => m.userId === userId)) {
                project.members.push({ id: 'member-' + Date.now(), userId, role: 'collaborator' });
                saveMockData(MOCK_PROJECTS_KEY, projects);
                console.log('DatabaseService: Mock project joined successfully');
            }
            return;
        }

        try {
            const { data: existing, error: checkError } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', projectId)
                .eq('user_id', userId)
                .maybeSingle();

            if (checkError) {
                console.error('DatabaseService: Error checking existing membership:', checkError);
                return;
            }

            if (!existing) {
                const { error: insertError } = await supabase.from('project_members').insert({
                    project_id: projectId,
                    user_id: userId,
                    role: 'collaborator'
                });

                if (insertError) {
                    console.error('DatabaseService: Error inserting project member:', insertError);
                    // This is where RLS might be failing
                } else {
                    console.log('DatabaseService: Real project joined successfully');
                }
            } else {
                console.log('DatabaseService: User is already a member of this project');
            }
        } catch (e) {
            console.error('DatabaseService: Unexpected error in joinProject:', e);
        }
    },

    async updateMemberRole(projectId: string, memberId: string, role: string) {
        console.log(`DatabaseService: Updating member ${memberId} role to ${role} in project ${projectId}`);
        if (projectId.includes('mock-')) {
            const projects = getMockData(MOCK_PROJECTS_KEY);
            const project = projects.find((p: any) => p.id === projectId);
            if (project) {
                const member = project.members.find((m: any) => m.id === memberId);
                if (member) {
                    member.projectRole = role;
                    member.role = role;
                    saveMockData(MOCK_PROJECTS_KEY, projects);
                }
            }
            return;
        }

        const { error } = await supabase
            .from('project_members')
            .update({ role })
            .eq('id', memberId)
            .eq('project_id', projectId);

        if (error) throw error;
    },


    async ensureDefaultProject(userId: string, displayName: string) {
        console.log(`DatabaseService: Ensuring default project for ${userId} (${displayName})`);
        try {
            const projects = await this.getProjects();
            if (projects.length === 0) {
                console.log('DatabaseService: No projects found. Creating default project.');
                const projectName = `${displayName}的故事`.replace(/\+86/g, ''); // Clean phone prefix if present
                await this.createProject(projectName, '我的第一个长生記项目');
            }
        } catch (e) {
            console.error('Error ensuring default project:', e);
        }
    },

    async syncProfile(userId: string, data: { full_name?: string; avatar_url?: string; phone?: string; email?: string; is_premium?: boolean }) {
        console.log(`DatabaseService: Syncing profile for ${userId}`, data);
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                ...data,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error syncing profile:', error);
            // Ignore error if table doesn't exist or other RLS issue for now to not block auth flow
        }
    },

    // --- Points System ---
    async getPoints() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;

        const { data, error } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', user.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching points:', error);
            return 0;
        }
        return data?.points || 0;
    },

    async getPointTransactions() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('point_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }

        return data.map(t => ({
            id: t.id,
            userId: t.user_id,
            amount: t.amount,
            type: t.type,
            description: t.description,
            createdAt: new Date(t.created_at).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        }));
    },

    async redeemCoupon(code: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('未登录');

        const upperCode = code.trim().toUpperCase();
        let amount = 0;
        let description = '';

        if (upperCode === 'EVERSTORY500') {
            amount = 500;
            description = '全能500元积分兑换券';
        } else if (upperCode === 'ES-GIFT-1000-N7B2R9') {
            amount = 1000;
            description = '高端定制1000元积分兑换券';
        } else if (upperCode === 'ES-PLATINUM-2000-W4X7V2') {
            amount = 2000;
            description = '至尊尊享2000元积分兑换券';
        } else if (upperCode === 'COMPENSATION-NICK-399') {
            amount = 399;
            description = '订单支付异常补偿积分';
        } else {
            throw new Error('无效的兑换码');
        }

        // 1. Check if already redeemed (to prevent double redemption of "universal" codes if desired)
        // For simplicity and "universal" requirement, we'll allow once per user.
        const { data: existing } = await supabase
            .from('point_transactions')
            .select('id')
            .eq('user_id', user.id)
            .eq('description', description)
            .maybeSingle();

        if (existing) {
            throw new Error('您已兑换过此礼品券');
        }

        // 2. Add transaction
        const { error: txError } = await supabase
            .from('point_transactions')
            .insert({
                user_id: user.id,
                amount: amount,
                type: 'earn',
                description: description
            });

        if (txError) throw txError;

        // 3. Update profile points
        const currentPoints = await this.getPoints();
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ points: currentPoints + amount })
            .eq('id', user.id);

        if (profileError) throw profileError;

        return { amount, description };
    },

    async spendPoints(amount: number, description: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('未登录');

        const currentPoints = await this.getPoints();
        if (currentPoints < amount) throw new Error('积分不足');

        // 1. Add transaction
        const { error: txError } = await supabase
            .from('point_transactions')
            .insert({
                user_id: user.id,
                amount: amount,
                type: 'spend',
                description: description
            });

        if (txError) throw txError;

        // 2. Update profile points
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ points: currentPoints - amount })
            .eq('id', user.id);

        if (profileError) throw profileError;

        return true;
    }
};

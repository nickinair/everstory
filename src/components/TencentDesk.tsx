import React, { useEffect, useRef } from 'react';
import { User } from '../types';

interface TencentDeskProps {
    currentUser: User | null;
}

/**
 * TencentDesk component for official Intelligent Customer Service (Desk/TCCC) integration.
 * This component handles user info synchronization and UI suppression for the 
 * static script loaded in index.html.
 */
const TencentDesk: React.FC<TencentDeskProps> = ({ currentUser }) => {
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        // Polling for SDK readiness to initialize user params (nickname/avatar)
        const initInterval = setInterval(() => {
            if (!isMounted.current) {
                clearInterval(initInterval);
                return;
            }

            const TcccApi = (window as any).TcccApi;
            const aiDesk = (window as any).aiDeskCustomer;

            if (TcccApi || aiDesk) {
                console.log('Tencent Desk SDK detected, syncing user info...');
                initializeParams();
                clearInterval(initInterval);
            }
        }, 1000);

        const initializeParams = () => {
            if (!isMounted.current) return;

            const TcccApi = (window as any).TcccApi;
            const aiDesk = (window as any).aiDeskCustomer;

            if (currentUser) {
                const nickname = currentUser.full_name || currentUser.name || currentUser.phone || '用户';
                const avatarUrl = currentUser.avatar_url || currentUser.avatar || '';

                if (TcccApi && typeof TcccApi.setInfo === 'function') {
                    TcccApi.setInfo({ nickname, avatarUrl });
                } else if (aiDesk && typeof aiDesk.setInfo === 'function') {
                    aiDesk.setInfo({ nickname, avatarUrl });
                }
            }
        };

        // If SDK is already there, initialize immediately
        if ((window as any).TcccApi || (window as any).aiDeskCustomer) {
            initializeParams();
        }

        // Polling to resize the Tencent Desk widget bubble
        const resizeInterval = setInterval(() => {
            if (!isMounted.current) {
                clearInterval(resizeInterval);
                return;
            }

            // Find the Tencent Desk iframe or wrapper (TCCC usually creates an iframe for the button)
            const tcccElements = document.querySelectorAll('iframe, div[id^="tccc"], div[class*="ai-desk"]');
            tcccElements.forEach(el => {
                const htmlEl = el as HTMLElement;
                // Check if it's the floating button by looking at its inline styles (fixed position, small size)
                const style = window.getComputedStyle(htmlEl);
                if (style.position === 'fixed' &&
                    (htmlEl.id.includes('tccc') || htmlEl.getAttribute('src')?.includes('tccc') || htmlEl.className.includes('ai-desk')) &&
                    !htmlEl.style.transform.includes('scale')) {
                    // Scale down the widget to 50% and anchor to bottom right
                    htmlEl.style.transform = 'scale(0.5)';
                    htmlEl.style.transformOrigin = 'bottom right';
                }
            });
        }, 1500);

        return () => {
            isMounted.current = false;
            clearInterval(initInterval);
            clearInterval(resizeInterval);
        };
    }, [currentUser]);

    return null;
};

export default TencentDesk;

/**
 * Global trigger function to open the chat window.
 * This is safe to call from anywhere in the app (e.g., from App.tsx button).
 */
export const openTencentChat = () => {
    const TcccApi = (window as any).TcccApi;
    const aiDesk = (window as any).aiDeskCustomer;
    const tuic = (window as any).TUICustomerServer;
    const yzf = (window as any).YZF;

    console.log('Triggering Tencent Chat...', {
        TcccApi: !!TcccApi,
        aiDesk: !!aiDesk,
        tuic: !!tuic,
        yzf: !!yzf
    });

    const trigger = () => {
        if (TcccApi && (typeof TcccApi.openChat === 'function' || typeof TcccApi.show === 'function')) {
            (TcccApi.openChat || TcccApi.show)();
            return true;
        } else if (aiDesk && (typeof aiDesk.show === 'function' || typeof aiDesk.open === 'function' || typeof aiDesk.toggle === 'function')) {
            (aiDesk.show || aiDesk.open || aiDesk.toggle)();
            return true;
        } else if (tuic && typeof tuic.show === 'function') {
            tuic.show();
            return true;
        } else if (yzf && typeof yzf.show === 'function') {
            yzf.show();
            return true;
        }
        return false;
    };

    if (trigger()) {
        console.log('Chat window triggered successfully.');
    } else {
        // Fallback: search for any iframe related to desk and try to show it
        const sidebar = document.querySelector('[class*="ai-desk-customer-sidebar"], [id*="ai-desk-customer-sidebar"]');
        if (sidebar instanceof HTMLElement) {
            sidebar.style.display = 'block';
            sidebar.style.visibility = 'visible';
            console.log('Showed sidebar via DOM fallback.');
        } else {
            console.warn('Tencent Customer Service APIs/UI not detected.');
            alert('客服系统正在初始化，请稍候再试（通常需要 2-3 秒）。');
        }
    }
};

// Types for Window access
declare global {
    interface Window {
        TcccApi: any;
        YZF: any;
        tccc: any;
        aiDeskCustomer: any;
        TUICustomerServer: any;
    }
}

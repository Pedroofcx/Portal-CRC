import db from '@/api/db';
import { useLocation } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';

export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await db.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
                    {/* 404 Error Code */}
                    <div className="text-center space-y-2">
                        <h1 className="text-7xl font-light text-slate-300">404</h1>
                        <div className="h-0.5 w-16 bg-slate-200 mx-auto"></div>
                    </div>
                    
                    {/* Main Message */}
                    <div className="text-center space-y-3">
                        <h2 className="text-2xl font-medium text-slate-800">
                            Página não encontrada
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            A página <span className="font-medium text-slate-700">"{pageName}"</span> não existe ou você não tem permissão para acessá-la.
                        </p>
                    </div>
                    
                    {/* Admin Note */}
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-sm font-medium text-amber-900">Nota do Admin</p>
                                    <p className="text-sm text-amber-700 leading-relaxed">
                                        Esta página pode não ter sido implementada ainda. Peça à IA para implementá-la no chat.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="pt-4 flex flex-col gap-3">
                        <button 
                            onClick={() => window.location.href = '/'} 
                            className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Voltar ao Dashboard
                        </button>
                        <button 
                            onClick={() => window.history.back()} 
                            className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Voltar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
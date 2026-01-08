import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { X, Loader2, Tent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CreateTripModalProps {
    festivalId: string;
    festivalName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function CreateTripModal({ festivalId, festivalName, isOpen, onClose }: CreateTripModalProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(`My ${festivalName} Trip`);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            // 1. Create Trip
            const { data: trip, error: tripError } = await (supabase as any)
                .from('trips')
                .insert([
                    {
                        name,
                        description,
                        festival_id: festivalId,
                        created_by: user.id
                    }
                ])
                .select()
                .single();

            if (tripError) throw tripError;

            // 2. Add creator as Admin Member
            const { error: memberError } = await (supabase as any)
                .from('trip_members')
                .insert([
                    {
                        trip_id: trip.id,
                        user_id: user.id,
                        role: 'admin',
                        status: 'accepted'
                    }
                ]);

            if (memberError) throw memberError;

            // 3. Navigate to Trip Page with new=true flag
            onClose();
            navigate(`/trips/${trip.id}?new=true`);

        } catch (error: any) {
            console.error('Error creating trip:', error);
            alert('Failed to create trip: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Tent className="w-5 h-5 text-purple-500" />
                        {t('trip_details.modals.create.title', { festival: festivalName })}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">{t('trip_details.modals.create.name_label')}</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 placeholder-slate-600"
                            placeholder={t('trip_details.modals.create.placeholder_name')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">{t('trip_details.modals.create.desc_label')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 placeholder-slate-600 h-24 resize-none"
                            placeholder={t('trip_details.modals.create.placeholder_desc')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            {t('trip_details.modals.create.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('trip_details.modals.create.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

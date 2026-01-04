import React, { useState, useRef } from 'react';
import { Link as LinkIcon, X, Loader2, Image as ImageIcon, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    folder?: string; // e.g. 'bands' or 'festivals'
}

export function ImageUpload({ value, onChange, folder = 'uploads' }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    
    // Create hidden file input ref
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file: File) => {
        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);

            onChange(data.publicUrl);
        } catch (error: any) {
            console.error('Error uploading image:', error);
            alert('Error uploading image: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleUrlImport = async () => {
        if (!urlInput) return;
        setIsUploading(true);
        
        try {
            // Try to fetch the image (Client-side CORS might block this)
            const response = await fetch(urlInput);
            if (!response.ok) throw new Error('Failed to fetch image');
            
            const blob = await response.blob();
            const file = new File([blob], "imported-image.jpg", { type: blob.type });
            
            // Upload as file
            await handleFile(file);
            setShowUrlInput(false);
            setUrlInput('');
        } catch (error) {
            console.warn('CORS blocked direct import, using raw URL instead:', error);
            // Fallback: Just use the URL directly
            onChange(urlInput);
            setShowUrlInput(false);
            setUrlInput('');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full space-y-3">
             {/* Preview Area */}
            {value ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-video md:h-64 h-48 w-full">
                    <img 
                        src={value} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.open(value, '_blank')}
                            className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-white transition"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div 
                    className={`relative rounded-xl border-2 border-dashed transition-all h-48 flex flex-col items-center justify-center gap-2
                        ${dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'}
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                     {isUploading ? (
                         <div className="flex flex-col items-center text-purple-400">
                             <Loader2 className="w-8 h-8 animate-spin mb-2" />
                             <span className="text-sm font-medium">Uploading...</span>
                         </div>
                     ) : !showUrlInput ? (
                         <>
                            <div className="p-3 bg-slate-800 rounded-full border border-slate-700 mb-1">
                                <ImageIcon className="w-6 h-6 text-slate-400" />
                            </div>
                            <div className="text-center px-4">
                                <p className="text-sm font-medium text-slate-300">
                                    <button 
                                        type="button" 
                                        onClick={() => inputRef.current?.click()}
                                        className="text-purple-400 hover:text-purple-300 transition"
                                    >
                                        Upload a file
                                    </button>
                                    {' '}or drag and drop
                                </p>
                                <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP up to 5MB</p>
                            </div>
                            
                            <div className="absolute bottom-4 right-4">
                                <button
                                    type="button"
                                    onClick={() => setShowUrlInput(true)}
                                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition bg-slate-900/50 px-2 py-1 rounded"
                                >
                                    <LinkIcon className="w-3 h-3" />
                                    Import from URL
                                </button>
                            </div>
                         </>
                     ) : (
                         <div className="w-full max-w-sm px-4 flex flex-col gap-2">
                             <h4 className="text-sm font-medium text-slate-300">Import Image from URL</h4>
                             <div className="flex gap-2">
                                 <input 
                                    type="url" 
                                    placeholder="https://example.com/image.jpg"
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    autoFocus
                                 />
                                 <button
                                    type="button"
                                    onClick={handleUrlImport}
                                    disabled={!urlInput}
                                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                 >
                                     Import
                                 </button>
                             </div>
                             <button 
                                type="button" 
                                onClick={() => setShowUrlInput(false)}
                                className="text-xs text-slate-500 hover:text-slate-400 self-center"
                             >
                                 Cancel
                             </button>
                         </div>
                     )}
                     
                     <input 
                        ref={inputRef} 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleChange}
                    />
                </div>
            )}
        </div>
    );
}

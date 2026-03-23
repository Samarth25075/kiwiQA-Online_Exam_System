import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import AdminLayout from '../components/AdminLayout';
import CustomPopup from '../components/CustomPopup';

const Icons = {
    Bank: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1M3 10v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" /><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" /><path d="m19 7-7-4-7 4" /></svg>
    ),
    Category: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
    ),
    Edit: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
    ),
    Delete: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
    ),
    ChevronRight: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
    ),
    Back: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
    ),
    Plus: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
    ),
    Grid: ({ size = 16 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
    ),
    List: ({ size = 16 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
    )
};

interface QuestionOption {
    text: string;
    is_correct: boolean;
}

interface BankQuestion {
    q_id: string;
    category: string;
    difficulty: string;
    text: string;
    options: QuestionOption[];
    explanation?: string;
    marks: number;
}

interface CategoryStat {
    category: string;
    count: number;
    total_marks: number;
}

const QuestionBank: React.FC = () => {
    const [stats, setStats] = useState<CategoryStat[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [questions, setQuestions] = useState<BankQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
    const [viewMode, setViewMode] = useState<'card' | 'grid'>(() => {
        return (localStorage.getItem('qb_view_mode') as 'card' | 'grid') || 'card';
    });
    const [isAdding, setIsAdding] = useState(false);
    const [isQuickAdding, setIsQuickAdding] = useState(false);
    const [quickCategoryName, setQuickCategoryName] = useState('');
    const [newQuestion, setNewQuestion] = useState<Partial<BankQuestion>>({
        category: '', difficulty: 'Beginner', text: '', marks: 1, explanation: '',
        options: [
            { text: '', is_correct: true },
            { text: '', is_correct: false },
            { text: '', is_correct: false },
            { text: '', is_correct: false }
        ]
    });
    const [popup, setPopup] = useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void } | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_BASE_URL}/exams/bank/stats`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(Array.isArray(data) ? data : []);
            } else {
                setError(`Failed to load stats: ${res.status}`);
            }
        } catch (err) {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async (category: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_BASE_URL}/exams/bank/questions?category=${encodeURIComponent(category)}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setQuestions(Array.isArray(data) ? data : []);
                setSelectedCategory(category);
            } else {
                setError("Failed to fetch questions");
            }
        } catch (err) {
            setError("Failed to fetch questions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleBack = () => {
        setSelectedCategory(null);
        setQuestions([]);
        fetchStats();
    };

    const handleDeleteCategory = (categoryName: string) => {
        setPopup({
            isOpen: true,
            title: "Delete Category",
            message: `Are you sure you want to delete ${categoryName} and all its questions? This cannot be undone.`,
            type: 'confirm',
            onConfirm: async () => {
                setPopup(null);
                try {
                    const token = localStorage.getItem("access_token");
                    const res = await fetch(`${API_BASE_URL}/categories/${categoryName}`, {
                        method: 'DELETE',
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (res.ok) {
                        setPopup({
                            isOpen: true,
                            title: "Deleted!",
                            message: "Category has been removed.",
                            type: 'alert'
                        });
                        fetchStats();
                    } else {
                        throw new Error("Failed to delete category");
                    }
                } catch (err) {
                    setPopup({
                        isOpen: true,
                        title: "Error",
                        message: "Something went wrong.",
                        type: 'alert'
                    });
                }
            }
        });
    };

    const handleDelete = async (q_id: string) => {
        setPopup({
            isOpen: true,
            title: 'Confirm Delete',
            message: 'Are you sure you want to remove this question from the bank? This action cannot be undone.',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem("access_token");
                    const res = await fetch(`${API_BASE_URL}/exams/bank/questions/${q_id}`, {
                        method: 'DELETE',
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (res.ok) {
                        setQuestions(prev => prev.filter(q => q.q_id !== q_id));
                        setPopup({ isOpen: true, title: 'Deleted', message: 'Question removed successfully!', type: 'alert' });
                    } else {
                        setPopup({ isOpen: true, title: 'Error', message: 'Failed to delete question.', type: 'alert' });
                    }
                } catch (err) {
                    setPopup({ isOpen: true, title: 'Error', message: 'Network error.', type: 'alert' });
                }
            }
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingQuestion) return;

        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_BASE_URL}/exams/bank/questions/${editingQuestion.q_id}`, {
                method: 'PUT',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(editingQuestion)
            });
            if (res.ok) {
                setQuestions(prev => prev.map(q => q.q_id === editingQuestion.q_id ? editingQuestion : q));
                setEditingQuestion(null);
                setPopup({ isOpen: true, title: 'Success', message: 'Question updated successfully!', type: 'alert' });
            } else {
                setPopup({ isOpen: true, title: 'Error', message: 'Failed to update question.', type: 'alert' });
            }
        } catch (err) {
            setPopup({ isOpen: true, title: 'Error', message: 'Network error.', type: 'alert' });
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_BASE_URL}/exams/bank/add`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(newQuestion)
            });
            if (res.ok) {
                setIsAdding(false);
                setNewQuestion({
                    category: '', difficulty: 'Beginner', text: '', marks: 1, explanation: '',
                    options: [
                        { text: '', is_correct: true },
                        { text: '', is_correct: false },
                        { text: '', is_correct: false },
                        { text: '', is_correct: false }
                    ]
                });
                setPopup({ isOpen: true, title: 'Success', message: 'Question added to bank!', type: 'alert' });
                if (selectedCategory && newQuestion.category === selectedCategory) {
                    fetchQuestions(selectedCategory);
                } else {
                    fetchStats();
                }
            } else {
                setPopup({ isOpen: true, title: 'Error', message: 'Failed to add question.', type: 'alert' });
            }
        } catch (err) {
            setPopup({ isOpen: true, title: 'Error', message: 'Network error.', type: 'alert' });
        }
    };

    const handleQuickCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_BASE_URL}/categories`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name: quickCategoryName })
            });
            if (res.ok) {
                setIsQuickAdding(false);
                setQuickCategoryName('');
                setPopup({ isOpen: true, title: 'Success', message: 'Category added successfully!', type: 'alert' });
                fetchStats();
            } else {
                setPopup({ isOpen: true, title: 'Error', message: 'Failed to add category.', type: 'alert' });
            }
        } catch (err) {
            setPopup({ isOpen: true, title: 'Error', message: 'Network error.', type: 'alert' });
        }
    };

    return (
        <AdminLayout>
            <div className="qb-container" style={{ padding: '24px' }}>
                <style>{`
                    .qb-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 32px;
                        padding-bottom: 24px;
                        border-bottom: 1px solid var(--slate-100);
                    }
                    .qb-title-group {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }
                    .qb-title {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 800;
                        color: var(--slate-900);
                        font-family: 'Outfit', sans-serif;
                        letter-spacing: -0.02em;
                    }
                    .qb-subtitle {
                        margin: 2px 0 0;
                        color: var(--slate-500);
                        font-size: 14px;
                    }

                    /* Category Cards */
                    .category-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                        gap: 20px;
                        animation: fadeIn 0.4s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .category-card {
                        background: white;
                        border: 1px solid var(--slate-100);
                        border-radius: 16px;
                        padding: 24px;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        position: relative;
                        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02);
                    }
                    .category-card:hover {
                        transform: translateY(-6px);
                        border-color: var(--primary);
                        box-shadow: 0 20px 25px -5px rgba(28, 132, 143, 0.1), 0 10px 10px -5px rgba(28, 132, 143, 0.04);
                    }
                    .category-icon {
                        width: 48px;
                        height: 48px;
                        background: linear-gradient(135deg, rgba(28, 132, 143, 0.1) 0%, rgba(28, 132, 143, 0.05) 100%);
                        color: var(--primary);
                        border-radius: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .category-name {
                        margin: 0;
                        font-size: 18px;
                        font-weight: 700;
                        color: var(--slate-800);
                        font-family: 'Outfit', sans-serif;
                    }
                    .category-meta {
                        display: flex;
                        gap: 16px;
                        padding-top: 14px;
                        border-top: 1px solid var(--slate-50);
                        font-size: 13px;
                        color: var(--slate-500);
                    }
                    .meta-item strong { color: var(--slate-800); }

                    /* Questions Styling */
                    .question-list {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        animation: fadeIn 0.4s ease-out;
                    }
                    .question-card {
                        background: white;
                        border: 1px solid var(--slate-100);
                        border-radius: 12px;
                        padding: 16px 20px;
                        transition: all 0.2s;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    }
                    .question-card:hover {
                        border-color: var(--primary-light);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    }
                    .q-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .q-badge {
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        padding: 3px 8px;
                        border-radius: 4px;
                    }
                    .q-badge-beginner { background: #dcfce7; color: #15803d; }
                    .q-badge-intermediate { background: #fef9c3; color: #a16207; }
                    .q-badge-advanced { background: #fee2e2; color: #b91c1c; }
                    .q-marks {
                        font-size: 12px;
                        font-weight: 600;
                        color: var(--slate-500);
                        background: var(--slate-50);
                        padding: 3px 8px;
                        border-radius: 4px;
                    }
                    
                    .q-text {
                        font-family: 'Outfit', sans-serif;
                        font-size: 15px;
                        font-weight: 600;
                        color: var(--slate-900);
                        margin: 0;
                        line-height: 1.5;
                    }
                    .q-options {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                    }
                    @media (max-width: 768px) {
                        .q-options { grid-template-columns: 1fr; }
                    }
                    .opt-item {
                        padding: 8px 12px;
                        background: #f8fafc;
                        border: 1px solid transparent;
                        border-radius: 8px;
                        font-size: 13px;
                        color: var(--slate-600);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        transition: all 0.2s;
                    }
                    .opt-item.correct {
                        background: #f0fdf4;
                        border-color: #10b981;
                        color: #15803d;
                        font-weight: 600;
                    }
                    .opt-dot {
                        width: 6px;
                        height: 6px;
                        border-radius: 50%;
                        flex-shrink: 0;
                    }
                    .q-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        margin-top: 0px;
                        padding-top: 14px;
                        border-top: 1px solid var(--slate-50);
                    }
                    .btn-action {
                        padding: 8px 16px;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                        border: 1.2px solid var(--slate-200);
                        background: white;
                        color: var(--slate-600);
                    }
                    .btn-edit:hover { 
                        border-color: var(--primary); 
                        color: var(--primary); 
                        background: rgba(28, 132, 143, 0.05); 
                    }
                    .btn-delete:hover { 
                        border-color: #e11d48; 
                        color: #e11d48; 
                        background: rgba(225, 29, 72, 0.05); 
                    }
                    .modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(15, 23, 42, 0.4);
                        backdrop-filter: blur(8px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 2000;
                        padding: 20px;
                        animation: overlayIn 0.3s ease-out;
                    }
                    @keyframes overlayIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .modal-content {
                        background: rgba(255, 255, 255, 0.95);
                        width: 100%;
                        max-width: 640px;
                        max-height: 85vh;
                        border-radius: 24px;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                        border: 1px solid rgba(255, 255, 255, 0.5);
                        animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    @keyframes modalPop {
                        from { transform: scale(0.9) translateY(20px); opacity: 0; }
                        to { transform: scale(1) translateY(0); opacity: 1; }
                    }
                    .modal-header {
                        padding: 24px 32px;
                        border-bottom: 1px solid var(--slate-100);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: linear-gradient(to right, rgba(28, 132, 143, 0.02), transparent);
                    }
                    .modal-title {
                        font-family: 'Outfit', sans-serif;
                        font-size: 22px;
                        font-weight: 800;
                        color: var(--slate-900);
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    .modal-body {
                        padding: 32px;
                        overflow-y: auto;
                        scrollbar-width: thin;
                        scrollbar-color: var(--slate-200) transparent;
                    }
                    .modal-footer {
                        padding: 20px 32px;
                        border-top: 1px solid var(--slate-100);
                        display: flex;
                        justify-content: flex-end;
                        gap: 16px;
                        background: var(--slate-50);
                    }
                    .form-section-title {
                        font-size: 14px;
                        font-weight: 700;
                        color: var(--slate-900);
                        margin: 24px 0 16px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .form-section-title:first-child { margin-top: 0; }
                    
                    .form-group { margin-bottom: 20px; }
                    .form-label { display: block; font-size: 13px; font-weight: 700; color: var(--slate-700); margin-bottom: 8px; }
                    .form-input, .form-select, .form-textarea {
                        width: 100%;
                        padding: 12px 14px;
                        border: 1.5px solid var(--slate-100);
                        border-radius: 12px;
                        background: white;
                        font-family: inherit;
                        font-size: 14px;
                        transition: all 0.2s;
                        color: var(--slate-900);
                    }
                    .form-input:focus, .form-select:focus, .form-textarea:focus { 
                        outline: none; 
                        border-color: var(--primary); 
                        box-shadow: 0 0 0 4px rgba(28, 132, 143, 0.1);
                        transform: translateY(-1px);
                    }

                    .option-input-group {
                        display: flex;
                        gap: 12px;
                        margin-bottom: 12px;
                        align-items: center;
                        background: white;
                        padding: 6px;
                        border-radius: 14px;
                        border: 1px solid var(--slate-50);
                        transition: all 0.2s;
                    }
                    .option-input-group:focus-within {
                        border-color: var(--slate-200);
                        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                    }
                    .radio-custom {
                        width: 20px; height: 20px;
                        cursor: pointer;
                        accent-color: var(--primary);
                    }
                `}</style>

                {/* ── Header ── */}
                <header className="qb-header">
                    <div className="qb-title-group">
                        {selectedCategory && (
                            <button
                                onClick={handleBack}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--slate-500)' }}
                            >
                                <Icons.Back />
                            </button>
                        )}
                        <div>
                            <h2 className="qb-title">
                                {selectedCategory ? selectedCategory : "Question Bank"}
                            </h2>
                            <p className="qb-subtitle">
                                {selectedCategory
                                    ? `Manage questions for ${selectedCategory}`
                                    : "Organize and curate your exam questions by category."}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div className="view-mode-toggle" style={{ display: 'flex', background: 'var(--slate-50)', padding: '4px', borderRadius: '10px', marginRight: '12px' }}>
                            <button
                                onClick={() => { setViewMode('card'); localStorage.setItem('qb_view_mode', 'card'); }}
                                style={{ padding: '6px 12px', background: viewMode === 'card' ? 'white' : 'transparent', border: 'none', borderRadius: '7px', cursor: 'pointer', boxShadow: viewMode === 'card' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: viewMode === 'card' ? 'var(--slate-900)' : 'var(--slate-500)', transition: 'all 0.2s' }}
                            >
                                <Icons.Grid size={13} /> Card view
                            </button>
                            <button
                                onClick={() => { setViewMode('grid'); localStorage.setItem('qb_view_mode', 'grid'); }}
                                style={{ padding: '6px 12px', background: viewMode === 'grid' ? 'white' : 'transparent', border: 'none', borderRadius: '7px', cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: viewMode === 'grid' ? 'var(--slate-900)' : 'var(--slate-500)', transition: 'all 0.2s' }}
                            >
                                <Icons.List size={13} /> Detailed Grid
                            </button>
                        </div>
                        <button
                            className="btn-add-q"
                            onClick={() => {
                                if (selectedCategory) {
                                    setNewQuestion({ ...newQuestion, category: selectedCategory });
                                    setIsAdding(true);
                                } else {
                                    setIsQuickAdding(true);
                                }
                            }}
                            style={{
                                padding: '10px 16px', borderRadius: '10px', background: 'var(--primary)', color: 'white',
                                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 12px rgba(28, 132, 143, 0.2)'
                            }}
                        >
                            <Icons.Plus /> {selectedCategory ? "Add Question" : "Add Category"}
                        </button>
                    </div>
                </header>

                {loading && !questions.length && (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}>
                        <div className="loader" style={{ marginBottom: '16px' }}>KiwiQA...</div>
                        Loading question bank...
                    </div>
                )}

                {error && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#dc2626' }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
                        <h4>{error}</h4>
                        <button onClick={fetchStats} className="refresh-btn">Try Again</button>
                    </div>
                )}

                {/* ── Category Step ── */}
                {!selectedCategory && !loading && (
                    viewMode === 'card' ? (
                        <div className="category-grid">
                            {stats.map(s => (
                                <div key={s.category} className="category-card" onClick={() => fetchQuestions(s.category)}>
                                    <div className="category-icon">
                                        <Icons.Category />
                                    </div>
                                    <h3 className="category-name">{s.category}</h3>
                                    <div className="category-meta">
                                        <div className="meta-item">
                                            <strong>{s.count}</strong> questions
                                        </div>
                                        <div className="meta-item">
                                            <strong>{s.total_marks}</strong> total marks
                                        </div>
                                    </div>
                                    <div style={{ position: 'absolute', right: '20px', bottom: '20px', color: 'var(--slate-300)' }}>
                                        <Icons.ChevronRight />
                                    </div>

                                    {/* Delete Category Button */}
                                    <button
                                        className="btn-delete-cat"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCategory(s.category);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            background: 'rgba(239, 68, 68, 0.05)',
                                            color: '#ef4444',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title="Delete Category"
                                    >
                                        <Icons.Delete />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="qb-table-container">
                            <style>{`
                                .qb-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; }
                                .qb-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 800; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--slate-50); }
                                .qb-table td { background: white; padding: 16px; border-bottom: 1px solid var(--slate-50); transition: all 0.2s; cursor: pointer; }
                                .qb-table tr:hover td { background: #fafbfc; border-color: var(--slate-100); }
                                .qb-table td:first-child { border-radius: 12px 0 0 12px; border-left: 1px solid var(--slate-50); }
                                .qb-table td:last-child { border-radius: 0 12px 12px 0; border-right: 1px solid var(--slate-50); }
                                .cat-name-cell { font-family: 'Outfit', sans-serif; font-weight: 700; color: var(--slate-900); font-size: 16px; }
                            `}</style>
                            <table className="qb-table">
                                <thead>
                                    <tr>
                                        <th>Category Folder</th>
                                        <th>Question Count</th>
                                        <th>Total Marks</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.map(s => (
                                        <tr key={s.category} onClick={() => fetchQuestions(s.category)}>
                                            <td style={{ verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className="category-icon" style={{ width: 32, height: 32, borderRadius: '8px' }}>
                                                        <Icons.Category />
                                                    </div>
                                                    <div className="cat-name-cell">{s.category}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600, color: 'var(--slate-600)' }}>{s.count}</span>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600, color: 'var(--slate-600)' }}>{s.total_marks}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(s.category); }}
                                                        style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                                                        onMouseOver={e => { (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'); }}
                                                        onMouseOut={e => { (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'); }}
                                                    >
                                                        <Icons.Delete />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* ── Questions Step ── */}
                {selectedCategory && !loading && (
                    viewMode === 'card' ? (
                        <div className="question-list">
                            {questions.map(q => (
                                <div key={q.q_id} className="question-card">
                                    <div className="q-header">
                                        <div className="q-badge-group">
                                            <span className={`q-badge q-badge-${q.difficulty.toLowerCase()}`}>
                                                {q.difficulty}
                                            </span>
                                        </div>
                                        <span className="q-marks">
                                            {q.marks} Marks
                                        </span>
                                    </div>
                                    <p className="q-text">{q.text}</p>
                                    <div className="q-options">
                                        {q.options.map((opt, idx) => (
                                            <div key={idx} className={`opt-item ${opt.is_correct ? 'correct' : ''}`}>
                                                <div
                                                    className="opt-dot"
                                                    style={{ background: opt.is_correct ? '#10b981' : '#cbd5e1' }}
                                                />
                                                {opt.text}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="q-actions">
                                        <button className="btn-action btn-edit" onClick={() => setEditingQuestion(q)}>
                                            <Icons.Edit /> Edit
                                        </button>
                                        <button className="btn-action btn-delete" onClick={() => handleDelete(q.q_id)}>
                                            <Icons.Delete /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="qb-table-container">
                            <style>{`
                                .qb-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; }
                                .qb-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 800; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--slate-50); }
                                .qb-table td { background: white; padding: 16px; border-bottom: 1px solid var(--slate-50); transition: all 0.2s; }
                                .qb-table tr:hover td { background: #fafbfc; border-color: var(--slate-100); }
                                .qb-table td:first-child { border-radius: 12px 0 0 12px; border-left: 1px solid var(--slate-50); }
                                .qb-table td:last-child { border-radius: 0 12px 12px 0; border-right: 1px solid var(--slate-50); }
                                .qb-table .q-text-cell { font-family: 'DM Sans', sans-serif; font-weight: 600; color: var(--slate-900); font-size: 14px; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                            `}</style>
                            <table className="qb-table">
                                <thead>
                                    <tr>
                                        <th>Question Details</th>
                                        <th>Difficulty</th>
                                        <th>Marks</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {questions.map(q => (
                                        <tr key={q.q_id}>
                                            <td style={{ verticalAlign: 'middle' }}>
                                                <div className="q-text-cell" title={q.text}>{q.text}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '4px', display: 'flex', gap: '8px' }}>
                                                    {q.options.length} Options • Correct: {q.options.find(o => o.is_correct)?.text.slice(0, 30)}...
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`q-badge q-badge-${q.difficulty.toLowerCase()}`}>
                                                    {q.difficulty}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="q-marks" style={{ padding: '4px 10px' }}>{q.marks}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => setEditingQuestion(q)}
                                                        style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--slate-50)', border: 'none', color: 'var(--slate-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                                                        onMouseOver={e => { (e.currentTarget.style.background = 'var(--slate-100)'); (e.currentTarget.style.color = 'var(--primary)'); }}
                                                        onMouseOut={e => { (e.currentTarget.style.background = 'var(--slate-50)'); (e.currentTarget.style.color = 'var(--slate-600)'); }}
                                                    >
                                                        <Icons.Edit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(q.q_id)}
                                                        style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                                                        onMouseOver={e => { (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'); }}
                                                        onMouseOut={e => { (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'); }}
                                                    >
                                                        <Icons.Delete />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* ── Edit Modal ── */}
                {editingQuestion && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    <Icons.Edit /> Edit Question
                                </h3>
                                <button onClick={() => setEditingQuestion(null)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    ✕
                                </button>
                            </div>
                            <div className="modal-body">
                                <form id="edit-q-form" onSubmit={handleUpdate}>
                                    <div className="form-section-title">
                                        QUESTION CONTENT
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Question Text</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={3}
                                            value={editingQuestion.text}
                                            onChange={e => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Difficulty Level</label>
                                            <select
                                                className="form-select"
                                                value={editingQuestion.difficulty}
                                                onChange={e => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                                            >
                                                <option>Beginner</option>
                                                <option>Intermediate</option>
                                                <option>Advanced</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Marks</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={editingQuestion.marks}
                                                onChange={e => setEditingQuestion({ ...editingQuestion, marks: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-section-title">
                                        ANSWER OPTIONS (Select one correct answer)
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {editingQuestion.options.map((opt, idx) => (
                                            <div key={idx} className="option-input-group">
                                                <div style={{ padding: '0 8px' }}>
                                                    <input
                                                        type="radio"
                                                        className="radio-custom"
                                                        name="is_correct"
                                                        checked={opt.is_correct}
                                                        onChange={() => {
                                                            const newOpts = editingQuestion.options.map((o, i) => ({
                                                                ...o, is_correct: i === idx
                                                            }));
                                                            setEditingQuestion({ ...editingQuestion, options: newOpts });
                                                        }}
                                                    />
                                                </div>
                                                <input
                                                    className="form-input"
                                                    style={{ border: 'none', background: 'transparent', padding: '10px 0' }}
                                                    value={opt.text}
                                                    onChange={e => {
                                                        const newOpts = [...editingQuestion.options];
                                                        newOpts[idx].text = e.target.value;
                                                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                                                    }}
                                                    required
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="form-section-title">
                                        ADDITIONAL DETAILS
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Explanation (Optional)</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={2}
                                            value={editingQuestion.explanation || ''}
                                            onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                                            placeholder="Explain why this answer is correct..."
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setEditingQuestion(null)}
                                    style={{ padding: '12px 24px', borderRadius: '12px', background: 'white', border: '1px solid var(--slate-200)', cursor: 'pointer', fontWeight: 600, color: 'var(--slate-600)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    form="edit-q-form"
                                    type="submit"
                                    style={{
                                        padding: '12px 24px', borderRadius: '12px', background: 'var(--primary)', color: 'white',
                                        border: 'none', cursor: 'pointer', fontWeight: 700,
                                        boxShadow: '0 4px 12px rgba(28, 132, 143, 0.2)'
                                    }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Add New Modal ── */}
                {isAdding && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    <Icons.Bank /> Add New Question
                                </h3>
                                <button onClick={() => setIsAdding(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    ✕
                                </button>
                            </div>
                            <div className="modal-body">
                                <form id="add-q-form" onSubmit={handleCreate}>
                                    <div className="form-section-title">
                                        GENERAL INFORMATION
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Category Name</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. Logical Reasoning"
                                            value={newQuestion.category}
                                            onChange={e => setNewQuestion({ ...newQuestion, category: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-section-title">
                                        QUESTION CONTENT
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Question Text</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={3}
                                            placeholder="Type your question here..."
                                            value={newQuestion.text}
                                            onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Difficulty Level</label>
                                            <select
                                                className="form-select"
                                                value={newQuestion.difficulty}
                                                onChange={e => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                                            >
                                                <option>Beginner</option>
                                                <option>Intermediate</option>
                                                <option>Advanced</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Marks</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={newQuestion.marks}
                                                onChange={e => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-section-title">
                                        ANSWER OPTIONS (Select one correct answer)
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {newQuestion.options?.map((opt, idx) => (
                                            <div key={idx} className="option-input-group">
                                                <div style={{ padding: '0 8px' }}>
                                                    <input
                                                        type="radio"
                                                        className="radio-custom"
                                                        name="is_correct_new"
                                                        checked={opt.is_correct}
                                                        onChange={() => {
                                                            const newOpts = newQuestion.options?.map((o, i) => ({
                                                                ...o, is_correct: i === idx
                                                            }));
                                                            setNewQuestion({ ...newQuestion, options: newOpts });
                                                        }}
                                                    />
                                                </div>
                                                <input
                                                    className="form-input"
                                                    style={{ border: 'none', background: 'transparent', padding: '10px 0' }}
                                                    placeholder={`Option ${idx + 1}`}
                                                    value={opt.text}
                                                    onChange={e => {
                                                        const newOpts = [...(newQuestion.options || [])];
                                                        newOpts[idx].text = e.target.value;
                                                        setNewQuestion({ ...newQuestion, options: newOpts });
                                                    }}
                                                    required
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="form-section-title">
                                        ADDITIONAL DETAILS
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Explanation (Optional)</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={2}
                                            placeholder="Explain why this answer is correct..."
                                            value={newQuestion.explanation || ''}
                                            onChange={e => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    style={{ padding: '12px 24px', borderRadius: '12px', background: 'white', border: '1px solid var(--slate-200)', cursor: 'pointer', fontWeight: 600, color: 'var(--slate-600)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    form="add-q-form"
                                    type="submit"
                                    style={{
                                        padding: '12px 24px', borderRadius: '12px', background: 'var(--primary)', color: 'white',
                                        border: 'none', cursor: 'pointer', fontWeight: 700,
                                        boxShadow: '0 4px 12px rgba(28, 132, 143, 0.2)'
                                    }}
                                >
                                    Add Question
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {popup && (
                    <CustomPopup
                        isOpen={popup.isOpen}
                        title={popup.title}
                        message={popup.message}
                        type={popup.type}
                        onConfirm={popup.onConfirm || (() => setPopup(null))}
                        onCancel={() => setPopup(null)}
                    />
                )}
                {/* ── Quick Add Category Modal ── */}
                {isQuickAdding && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '440px' }}>
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    <Icons.Category /> New Category
                                </h3>
                                <button onClick={() => setIsQuickAdding(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    ✕
                                </button>
                            </div>
                            <div className="modal-body">
                                <p style={{ fontSize: '14px', color: 'var(--slate-500)', marginBottom: '24px' }}>
                                    Create a new folder to organize your questions.
                                </p>
                                <form id="quick-add-cat-form" onSubmit={handleQuickCreate}>
                                    <div className="form-group">
                                        <label className="form-label">Category Name</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. Cognitive Psychology"
                                            value={quickCategoryName}
                                            onChange={e => setQuickCategoryName(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setIsQuickAdding(false)}
                                    style={{ padding: '12px 20px', borderRadius: '12px', background: 'white', border: '1px solid var(--slate-200)', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    form="quick-add-cat-form"
                                    type="submit"
                                    style={{
                                        padding: '12px 20px', borderRadius: '12px', background: 'var(--primary)', color: 'white',
                                        border: 'none', cursor: 'pointer', fontWeight: 700,
                                        boxShadow: '0 4px 12px rgba(28, 132, 143, 0.2)'
                                    }}
                                >
                                    Create Category
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default QuestionBank;

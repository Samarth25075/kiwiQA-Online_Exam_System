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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
    ),
    Grid: ({ size = 16 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
    ),
    List: ({ size = 16 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
    ),
    Close: ({ size = 18 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    ),
    ChevronDown: ({ size = 14 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
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
    type?: 'multiple-choice' | 'coding';
    options?: QuestionOption[];
    skeleton_code?: string;
    language?: string;
    test_cases?: any[];
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

    // Prevent background scrolling when any modal is open
    useEffect(() => {
        const isAnyModalOpen = isAdding || editingQuestion !== null || isQuickAdding;
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isAdding, editingQuestion, isQuickAdding]);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = sessionStorage.getItem("access_token");
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
            const token = sessionStorage.getItem("access_token");
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
                    const token = sessionStorage.getItem("access_token");
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
                    const token = sessionStorage.getItem("access_token");
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
            const token = sessionStorage.getItem("access_token");
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
            const token = sessionStorage.getItem("access_token");
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
            const token = sessionStorage.getItem("access_token");
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
            <div className="qb-container">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

                    .qb-container {
                        min-height: calc(100vh - 80px);
                        background: var(--bg-neutral);
                        font-family: var(--font-body);
                        padding: 24px;
                    }

                    .qb-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 32px;
                        padding-bottom: 24px;
                        border-bottom: 1px solid var(--border);
                    }
                    .qb-title-group {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }
                    .qb-title {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 700;
                        color: var(--text);
                        font-family: var(--font-heading);
                        letter-spacing: -0.01em;
                    }
                    .qb-subtitle {
                        margin: 2px 0 0;
                        color: var(--text-muted);
                        font-size: 14px;
                        font-weight: 400;
                    }

                    /* Category Cards Redesign */
                    .category-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                        gap: 16px;
                        animation: fadeIn 0.4s ease-out;
                    }

                    .category-card {
                        background: var(--bg);
                        border: 1px solid var(--border);
                        border-radius: 14px;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        position: relative;
                        cursor: default;
                    }

                    .category-card:hover {
                        transform: translateY(-3px);
                        border-color: #B8B0F5;
                        box-shadow: 0 10px 20px rgba(99, 84, 220, 0.13);
                    }

                    .card-top {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .category-icon {
                        width: 40px;
                        height: 40px;
                        background: var(--primary-light);
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--primary);
                    }

                    .category-icon svg {
                        width: 20px;
                        height: 20px;
                        stroke: var(--primary);
                        stroke-width: 1.8;
                    }

                    .cat-badge {
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 10px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.04em;
                    }

                    .badge-agile { background: color-mix(in srgb, var(--primary), transparent 85%); color: var(--primary); }
                    .badge-hr { background: color-mix(in srgb, var(--color-danger), transparent 85%); color: var(--color-danger); }
                    .badge-project-mg { background: color-mix(in srgb, var(--color-success), transparent 85%); color: var(--color-success); }
                    .badge-default { background: var(--bg-neutral); color: var(--primary); }

                    .category-name {
                        margin: 0;
                        font-size: 16px;
                        font-weight: 600;
                        color: var(--text);
                        letter-spacing: -0.2px;
                        font-family: var(--font-heading);
                    }

                    .category-description {
                        margin: 4px 0 0;
                        font-size: 12px;
                        font-weight: 400;
                        color: var(--text-muted);
                        line-height: 1.4;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        font-family: var(--font-body);
                    }

                    .card-divider {
                        height: 1px;
                        background: var(--border);
                        margin: 0;
                    }

                    .card-stats {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }

                    .stat-col {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                    }

                    .stat-num {
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--primary);
                        letter-spacing: -0.5px;
                        font-family: 'DM Sans', sans-serif;
                    }

                    .stat-label {
                        font-size: 11px;
                        font-weight: 500;
                        text-transform: uppercase;
                        letter-spacing: 0.04em;
                        color: var(--text-muted);
                        font-family: 'DM Sans', sans-serif;
                    }

                    .stat-divider {
                        width: 1px;
                        height: 30px;
                        background: var(--border);
                        margin: 0 16px;
                    }

                    .card-actions {
                        display: flex;
                        gap: 8px;
                        margin-top: 4px;
                    }

                    .btn-delete-bank {
                        flex: 1;
                        height: 36px;
                        background: var(--color-danger-light);
                        border: 1px solid var(--color-danger-border);
                        border-radius: 8px;
                        color: var(--color-danger);
                        font-size: 12px;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: 'DM Sans', sans-serif;
                    }

                    .btn-delete-bank:hover { background: #FFECEC; }

                    .btn-edit-bank {
                        flex: 2;
                        height: 36px;
                        background: var(--primary);
                        color: var(--text-on-primary);
                        border: none;
                        border-radius: 8px;
                        font-size: 12px;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: 'DM Sans', sans-serif;
                    }

                    .btn-edit-bank:hover { background: #4439C0; }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    /* Questions Styling */
                    .question-list {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        animation: fadeIn 0.4s ease-out;
                    }
                    .question-card {
                        background: var(--bg-raised);
                        border: 1px solid var(--border);
                        border-radius: 14px;
                        padding: 24px 28px;
                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        box-shadow: var(--shadow-sm);
                    }
                    .question-card:hover {
                        border-color: var(--primary-light);
                        transform: translateY(-2px);
                        box-shadow: var(--shadow);
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
                        letter-spacing: 0.08em;
                        padding: 4px 10px;
                        border-radius: 6px;
                    }
                    .q-badge-beginner { background: var(--color-success-light); color: var(--color-success); border: 1px solid var(--color-success-border); }
                    .q-badge-intermediate { background: var(--color-warning-light); color: var(--color-warning); border: 1px solid var(--color-warning-border); }
                    .q-badge-advanced { background: var(--color-danger-light); color: var(--color-danger); border: 1px solid var(--color-danger-border); }
                    
                    .q-marks {
                        font-size: 11px;
                        font-weight: 800;
                        color: var(--text);
                        background: var(--bg-sunken);
                        padding: 4px 12px;
                        border-radius: 6px;
                        border: 1px solid var(--border);
                    }
                    
                    .q-text {
                        font-family: var(--font-body);
                        font-size: 15px;
                        font-weight: 500;
                        color: var(--text-muted);
                        margin: 4px 0;
                        line-height: 1.7;
                        letter-spacing: 0.015em;
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    .q-options {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 12px;
                        margin-top: 4px;
                    }
                    @media (max-width: 768px) {
                        .q-options { grid-template-columns: 1fr; }
                    }
                    .opt-item {
                        padding: 14px 20px;
                        background: var(--bg-sunken);
                        border: 2px solid transparent;
                        border-radius: 12px;
                        font-size: 14px;
                        font-weight: 600;
                        color: var(--text-muted);
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        transition: all 0.2s ease;
                    }
                    .opt-item.correct {
                        background: var(--color-success-light);
                        border-color: var(--color-success);
                        color: var(--color-success);
                        box-shadow: 0 0 15px var(--color-success-light);
                    }
                    .opt-dot {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        flex-shrink: 0;
                        background: var(--border-strong);
                    }
                    .opt-item.correct .opt-dot {
                        background: var(--color-success);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 14px;
                        height: 14px;
                        border-radius: 4px;
                    }
                    .q-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                        margin-top: 8px;
                        padding-top: 20px;
                    }
                    .btn-action {
                        padding: 10px 20px;
                        border-radius: 10px;
                        font-size: 13.5px;
                        font-weight: 700;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        cursor: pointer;
                        transition: all 0.2s;
                        border: none;
                        background: var(--bg-sunken);
                        color: var(--text-muted);
                    }
                    .btn-edit:hover { background: var(--primary-light); color: var(--primary); }
                    .btn-delete:hover { background: var(--color-danger-light); color: var(--color-danger); }
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
                        background: var(--bg-raised);
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
                        font-family: 'Inter', sans-serif;
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
                        scrollbar-color: var(--border) transparent;
                    }
                    .modal-footer {
                        padding: 24px 32px;
                        border-top: 1px solid var(--border);
                        display: flex;
                        justify-content: flex-end;
                        gap: 16px;
                        background: var(--bg-sunken);
                        border-radius: 0 0 24px 24px;
                    }
                    .form-section-title {
                        font-size: 11px;
                        font-weight: 800;
                        color: var(--primary);
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                        margin: 28px 0 16px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .form-section-title:first-child { margin-top: 0; }
                    
                    .form-group { margin-bottom: 24px; }
                    .form-label { 
                        display: block; 
                        font-size: 11px; 
                        font-weight: 900; 
                        color: var(--text); 
                        margin-bottom: 10px; 
                        text-transform: uppercase; 
                        letter-spacing: 0.1em;
                    }
                    .form-input, .form-select, .form-textarea {
                        width: 100%;
                        padding: 12px 16px;
                        border: 1.5px solid var(--border);
                        border-radius: 12px;
                        background: var(--bg-sunken);
                        font-family: inherit;
                        font-size: 14.5px;
                        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                        color: var(--text);
                    }
                    
                    /* Specific light-mode overrides */
                    [data-theme="light"] .form-input, 
                    [data-theme="light"] .form-select, 
                    [data-theme="light"] .form-textarea {
                        background: #f0f9ff !important;
                        border-color: #e0f2fe !important;
                    }
                    
                    .form-input:focus, .form-select:focus, .form-textarea:focus { 
                        outline: none; 
                        border-color: var(--primary); 
                        box-shadow: 0 0 0 4px var(--primary-light);
                        transform: translateY(-1px);
                        background: var(--bg);
                    }

                    .form-select {
                        appearance: none !important;
                        -webkit-appearance: none !important;
                        -moz-appearance: none !important;
                        /* Default / Light Mode Icon (Dark Stroke) */
                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%232c3e50' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
                        background-repeat: no-repeat !important;
                        background-position: right 14px center !important;
                        background-size: 16px !important;
                        padding-right: 40px !important;
                        cursor: pointer;
                    }

                    /* Dark Mode Icon Override (White Stroke) */
                    [data-theme="dark"] .form-select {
                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
                    }

                    .option-input-group {
                        display: flex;
                        gap: 12px;
                        margin-bottom: 12px;
                        align-items: center;
                        background: var(--bg-sunken);
                        padding: 10px 14px;
                        border-radius: 14px;
                        border: 1.5px solid var(--border);
                        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    .option-input-group:focus-within {
                        border-color: var(--primary);
                        background: var(--bg);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    }

                    /* Hide spin buttons for Marks input */
                    input[type=number]::-webkit-inner-spin-button, 
                    input[type=number]::-webkit-outer-spin-button { 
                        -webkit-appearance: none; 
                        margin: 0; 
                    }
                    input[type=number] { -moz-appearance: textfield; }

                    .radio-custom {
                        width: 20px; height: 20px;
                        cursor: pointer;
                        accent-color: var(--primary);
                    }

                    .view-mode-toggle {
                        display: flex;
                        background: var(--bg-sunken);
                        padding: 4.5px;
                        border-radius: 14px;
                        margin-right: 12px;
                        border: 1px solid var(--border);
                    }
                    .view-toggle-btn {
                        padding: 7px 18px;
                        background: transparent;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-family: var(--font-heading);
                        font-size: 13.5px;
                        font-weight: 700;
                        color: var(--text-muted);
                        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                        white-space: nowrap;
                    }
                    .view-toggle-btn.active {
                        background: var(--bg);
                        color: var(--primary);
                        box-shadow: var(--shadow-sm);
                    }
                    .view-toggle-btn:hover:not(.active) {
                        background: var(--primary-lighter);
                        color: var(--primary);
                    }
                `}</style>

                {/* â”€â”€ Header â”€â”€ */}
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
                            <div className="qb-breadcrumb" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-subtle)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>Question Bank</span>
                                {selectedCategory && (
                                    <>
                                        <Icons.ChevronRight />
                                        <span style={{ color: 'var(--primary)' }}>{selectedCategory}</span>
                                    </>
                                )}
                            </div>
                            <h2 className="qb-title" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>
                                {selectedCategory ? selectedCategory : "Question Bank"}
                            </h2>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div className="view-mode-toggle">
                            <button
                                className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                                onClick={() => { setViewMode('card'); localStorage.setItem('qb_view_mode', 'card'); }}
                            >
                                <Icons.Grid size={14} /> Card view
                            </button>
                            <button
                                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => { setViewMode('grid'); localStorage.setItem('qb_view_mode', 'grid'); }}
                            >
                                <Icons.List size={14} /> Detailed Grid
                            </button>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                if (selectedCategory) {
                                    setNewQuestion({ ...newQuestion, category: selectedCategory });
                                    setIsAdding(true);
                                } else {
                                    setIsQuickAdding(true);
                                }
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
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>âš ï¸</div>
                        <h4>{error}</h4>
                        <button onClick={fetchStats} className="refresh-btn">Try Again</button>
                    </div>
                )}

                {/* â”€â”€ Category Step â”€â”€ */}
                {!selectedCategory && !loading && (
                    viewMode === 'card' ? (
                        <div className="category-grid">
                            {stats.map(s => {
                                let badgeClass = "badge-default";
                                const catLower = s.category.toLowerCase();
                                if (catLower.includes('agile')) badgeClass = "badge-agile";
                                else if (catLower.includes('hr')) badgeClass = "badge-hr";
                                else if (catLower.includes('project') || catLower.includes('mgmt')) badgeClass = "badge-project-mg";

                                return (
                                    <div key={s.category} className="category-card">
                                        <div className="card-top">
                                            <div className="category-icon">
                                                <Icons.Category />
                                            </div>
                                            <div className="badge-area">
                                                <span className={`cat-badge ${badgeClass}`}>{s.category}</span>
                                            </div>
                                        </div>

                                        <div className="card-content">
                                            <h3 className="category-name">{s.category}</h3>
                                            <p className="category-description">Management of questions related to {s.category}.</p>
                                        </div>

                                        <div className="card-divider"></div>

                                        <div className="card-stats">
                                            <div className="stat-col">
                                                <span className="stat-num">{s.count}</span>
                                                <span className="stat-label">Questions</span>
                                            </div>
                                            <div className="stat-divider"></div>
                                            <div className="stat-col">
                                                <span className="stat-num">{s.total_marks}</span>
                                                <span className="stat-label">Total Marks</span>
                                            </div>
                                        </div>

                                        <div className="card-actions">
                                            {!(s.category.toLowerCase().startsWith('programming (coding') || s.category.toLowerCase() === 'programming (advanced)') && (
                                                <button
                                                    className="btn-delete-bank"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(s.category); }}
                                                >
                                                    <Icons.Delete /> Delete
                                                </button>
                                            )}
                                            <button
                                                className="btn-edit-bank"
                                                onClick={() => fetchQuestions(s.category)}
                                            >
                                                <Icons.Edit /> Edit Bank
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="qb-table-container">
                            <style>{`
                                .qb-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; }
                                .qb-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--border); }
                                .qb-table td { background: var(--bg); padding: 16px; border-bottom: 1px solid var(--border); transition: all 0.2s; cursor: pointer; }
                                .qb-table tr:hover td { background: var(--bg-neutral); border-color: var(--border); }
                                .qb-table td:first-child { border-radius: 12px 0 0 12px; border-left: 1px solid var(--border); }
                                .qb-table td:last-child { border-radius: 0 12px 12px 0; border-right: 1px solid var(--border); }
                                .cat-name-cell { font-family: var(--font-heading); font-weight: 700; color: var(--text); font-size: 16px; }
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
                                                    {!(s.category.toLowerCase().startsWith('programming (coding') || s.category.toLowerCase() === 'programming (advanced)') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteCategory(s.category); }}
                                                            style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                                                            onMouseOver={e => { (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'); }}
                                                            onMouseOut={e => { (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'); }}
                                                        >
                                                            <Icons.Delete />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* â”€â”€ Questions Step â”€â”€ */}
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
                                        {q.type === 'coding' ? (
                                            <div className="opt-item" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--primary)', gridColumn: 'span 2' }}>
                                                <div className="opt-dot" style={{ background: 'var(--primary)' }} />
                                                💻 HANDS-ON CODING CHALLENGE ({q.language || 'Any Language'})
                                            </div>
                                        ) : (
                                            (q.options || []).map((opt, idx) => (
                                                <div key={idx} className={`opt-item ${opt.is_correct ? 'correct' : ''}`}>
                                                    <div
                                                        className="opt-dot"
                                                        style={{ background: opt.is_correct ? 'var(--color-success)' : 'var(--border)' }}
                                                    />
                                                    {opt.text}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="q-actions">
                                        <button className="btn-action btn-edit" onClick={() => setEditingQuestion(q)}>
                                            <Icons.Edit /> Edit
                                        </button>
                                        {!(selectedCategory?.trim().toLowerCase().startsWith('programming (coding') || selectedCategory?.trim().toLowerCase() === 'programming (advanced)') && (
                                            <button className="btn-action btn-delete" onClick={() => handleDelete(q.q_id)}>
                                                <Icons.Delete /> Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="qb-table-container">
                            <style>{`
                                .qb-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; }
                                .qb-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--border); }
                                .qb-table td { background: var(--bg); padding: 16px; border-bottom: 1px solid var(--border); transition: all 0.2s; }
                                .qb-table tr:hover td { background: var(--bg-neutral); border-color: var(--border); }
                                .qb-table td:first-child { border-radius: 12px 0 0 12px; border-left: 1px solid var(--border); }
                                .qb-table td:last-child { border-radius: 0 12px 12px 0; border-right: 1px solid var(--border); }
                                .qb-table .q-text-cell { font-family: var(--font-body); font-weight: 600; color: var(--text); font-size: 14px; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
                                                {q.type === 'coding' ? (
                                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>💻 Coding Task ({q.language})</span>
                                                ) : (
                                                    <>
                                                        {(q.options || []).length} Options •
                                                        <span style={{ color: 'var(--color-success)' }}>
                                                            ✅ {(q.options || []).find(o => o.is_correct)?.text.slice(0, 30)}...
                                                        </span>
                                                    </>
                                                )}
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
                                                        {!(selectedCategory?.trim().toLowerCase().startsWith('programming (coding') || selectedCategory?.trim().toLowerCase() === 'programming (advanced)') && (
                                                        <button
                                                            onClick={() => handleDelete(q.q_id)}
                                                            style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                                                            onMouseOver={e => { (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'); }}
                                                            onMouseOut={e => { (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'); }}
                                                        >
                                                            <Icons.Delete />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* â”€â”€ Edit Modal â”€â”€ */}
                {editingQuestion && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '600px', background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                            <div className="modal-header" style={{ borderBottom: 'none', padding: '32px 32px 14px' }}>
                                <h3 className="modal-title" style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 800 }}>
                                    <Icons.Edit /> Edit Question
                                </h3>
                                <button onClick={() => setEditingQuestion(null)} style={{ background: 'var(--bg-sunken)', border: 'none', cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <Icons.Close size={20} />
                                </button>
                            </div>
                            <div className="modal-body" style={{ padding: '0 32px 32px' }}>
                                <form id="edit-q-form" onSubmit={handleUpdate}>
                                    <div className="form-section-title" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '32px' }}>
                                        GENERAL INFORMATION
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Category Name</label>
                                        <select
                                            className="form-select"
                                            value={editingQuestion.category}
                                            onChange={e => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                                            required
                                            style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text)', height: '52px', fontSize: '15px', width: '100%' }}
                                        >
                                            <option value="">Select Category</option>
                                            {stats.map(s => (
                                                <option key={s.category} value={s.category}>{s.category}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-section-title" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '32px' }}>
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
                                            style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text)', height: 'auto', minHeight: '100px', fontSize: '15px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Difficulty Level</label>
                                            <div style={{ position: 'relative' }}>
                                                <select
                                                    className="form-select"
                                                    value={editingQuestion.difficulty}
                                                    onChange={e => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                                                    style={{ 
                                                        background: 'var(--bg-sunken)', 
                                                        border: '1px solid var(--border)', 
                                                        color: 'var(--text)', 
                                                        height: '52px', 
                                                        fontSize: '15px',
                                                        width: '100%',
                                                        paddingRight: '40px'
                                                    }}
                                                >
                                                    <option>Beginner</option>
                                                    <option>Intermediate</option>
                                                    <option>Advanced</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Marks</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={editingQuestion.marks}
                                                onChange={e => setEditingQuestion({ ...editingQuestion, marks: parseInt(e.target.value) })}
                                                style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text)', height: '52px', fontSize: '15px' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-section-title" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '32px' }}>
                                        ANSWER OPTIONS / HANDS-ON CODE
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {editingQuestion.type === 'coding' ? (
                                            <div style={{ background: 'var(--bg-sunken)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                                    This is a hands-on coding question. Update the skeleton code or test cases.
                                                </p>
                                                <div className="form-group">
                                                    <label className="form-label">Skeleton Code</label>
                                                    <textarea 
                                                        className="form-textarea" 
                                                        rows={6}
                                                        value={editingQuestion.skeleton_code || ''}
                                                        onChange={e => setEditingQuestion({...editingQuestion, skeleton_code: e.target.value})}
                                                        style={{ fontFamily: 'monospace', fontSize: '12px', background: '#1e1e1e', color: '#d4d4d4' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Language</label>
                                                    <input 
                                                        className="form-input"
                                                        value={editingQuestion.language || ''}
                                                        onChange={e => setEditingQuestion({...editingQuestion, language: e.target.value})}
                                                        placeholder="e.g. javascript, python"
                                                    />
                                                </div>

                                                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                        <label className="form-label" style={{ margin: 0 }}>Test Cases</label>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const tc = [...(editingQuestion.test_cases || [])];
                                                                tc.push({ input: '', expected: '' });
                                                                setEditingQuestion({...editingQuestion, test_cases: tc});
                                                            }}
                                                            style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '6px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                                                        >
                                                            + Add Case
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {(editingQuestion.test_cases || []).map((tc, tidx) => (
                                                            <div key={tidx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '10px', alignItems: 'center' }}>
                                                                <input 
                                                                    className="form-input" 
                                                                    placeholder="Input (e.g. [1,2])" 
                                                                    value={tc.input} 
                                                                    onChange={e => {
                                                                        const newTc = [...(editingQuestion.test_cases || [])];
                                                                        newTc[tidx].input = e.target.value;
                                                                        setEditingQuestion({...editingQuestion, test_cases: newTc});
                                                                    }}
                                                                    style={{ fontSize: '12px', height: '36px' }}
                                                                />
                                                                <input 
                                                                    className="form-input" 
                                                                    placeholder="Expected (e.g. 3)" 
                                                                    value={tc.expected} 
                                                                    onChange={e => {
                                                                        const newTc = [...(editingQuestion.test_cases || [])];
                                                                        newTc[tidx].expected = e.target.value;
                                                                        setEditingQuestion({...editingQuestion, test_cases: newTc});
                                                                    }}
                                                                    style={{ fontSize: '12px', height: '36px' }}
                                                                />
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        const newTc = (editingQuestion.test_cases || []).filter((_, i) => i !== tidx);
                                                                        setEditingQuestion({...editingQuestion, test_cases: newTc});
                                                                    }}
                                                                    style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', height: '36px', cursor: 'pointer' }}
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {(editingQuestion.test_cases || []).length === 0 && (
                                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: '10px 0' }}>No test cases added yet.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            (editingQuestion.options || []).map((opt, idx) => (
                                                <div key={idx} className="option-input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 16px' }}>
                                                    <div style={{ padding: '0 8px' }}>
                                                        <input
                                                            type="radio"
                                                            className="radio-custom"
                                                            name="is_correct"
                                                            checked={opt.is_correct}
                                                            onChange={() => {
                                                                const newOpts = (editingQuestion.options || []).map((o, i) => ({
                                                                    ...o, is_correct: i === idx
                                                                }));
                                                                setEditingQuestion({ ...editingQuestion, options: newOpts });
                                                            }}
                                                        />
                                                    </div>
                                                    <input
                                                        className="form-input"
                                                        style={{ border: 'none', background: 'transparent', padding: '10px 0', flexGrow: 1, color: 'var(--text)' }}
                                                        placeholder={`Option ${idx + 1}`}
                                                        value={opt.text}
                                                        onChange={e => {
                                                            const newOpts = [...(editingQuestion.options || [])];
                                                            newOpts[idx].text = e.target.value;
                                                            setEditingQuestion({ ...editingQuestion, options: newOpts });
                                                        }}
                                                        required
                                                    />
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="form-section-title" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '32px' }}>
                                        ADDITIONAL DETAILS
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Explanation (Optional)</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={2}
                                            value={editingQuestion.explanation || ''}
                                            onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                                            placeholder="Explain why this answer is correct..."
                                            style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text)', height: 'auto', minHeight: '80px', fontSize: '15px' }}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer" style={{ background: 'var(--bg-sunken)', borderTop: '1px solid var(--border)', padding: '24px 32px', borderRadius: '0 0 24px 24px' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingQuestion(null)}
                                    style={{ padding: '12px 28px', borderRadius: '14px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 800, fontSize: '14px', color: 'var(--text)', minWidth: '100px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    form="edit-q-form"
                                    type="submit"
                                    style={{
                                        padding: '12px 28px', borderRadius: '14px', background: 'var(--primary)', color: 'white',
                                        border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '14px',
                                        boxShadow: 'var(--shadow-primary)', minWidth: '160px'
                                    }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* â”€â”€ Add New Modal â”€â”€ */}
                {isAdding && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '600px', background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                            <div className="modal-header" style={{ borderBottom: 'none', padding: '32px 32px 14px' }}>
                                <h3 className="modal-title" style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 800 }}>
                                    <Icons.Bank /> Add New Question
                                </h3>
                                <button onClick={() => setIsAdding(false)} style={{ background: 'var(--bg-sunken)', border: 'none', cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <Icons.Close size={20} />
                                </button>
                            </div>
                            <div className="modal-body" style={{ padding: '0 32px 32px' }}>
                                <form id="add-q-form" onSubmit={handleCreate}>
                                    <div className="form-section-title" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '32px' }}>
                                        GENERAL INFORMATION
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Category Name</label>
                                        <select
                                            className="form-select"
                                            value={newQuestion.category}
                                            onChange={e => setNewQuestion({ ...newQuestion, category: e.target.value })}
                                            required
                                            style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text)', height: '52px', fontSize: '15px', width: '100%' }}
                                        >
                                            <option value="">Select Category</option>
                                            {stats.map(s => (
                                                <option key={s.category} value={s.category}>{s.category}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-section-title" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '32px' }}>
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
                                            style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text)', height: 'auto', minHeight: '100px', fontSize: '15px' }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Difficulty Level</label>
                                            <div style={{ position: 'relative' }}>
                                                <select
                                                    className="form-select"
                                                    value={newQuestion.difficulty}
                                                    onChange={e => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                                                    style={{ 
                                                        background: 'var(--bg-sunken)', 
                                                        border: '1px solid var(--border)', 
                                                        color: 'var(--text)', 
                                                        height: '52px', 
                                                        fontSize: '15px',
                                                        width: '100%',
                                                        paddingRight: '40px'
                                                    }}
                                                >
                                                    <option>Beginner</option>
                                                    <option>Intermediate</option>
                                                    <option>Advanced</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Marks</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={newQuestion.marks}
                                                onChange={e => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) })}
                                                style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text)', height: '52px', fontSize: '15px' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-section-title" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '32px' }}>
                                        ANSWER CONTENT
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {newQuestion.category?.includes('Programming') || newQuestion.category?.includes('Coding') ? (
                                             <div style={{ background: 'var(--bg-sunken)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                <div className="form-group">
                                                    <label className="form-label">Skeleton Code</label>
                                                    <textarea 
                                                        className="form-textarea" 
                                                        rows={4}
                                                        value={newQuestion.skeleton_code || ''}
                                                        onChange={e => setNewQuestion({...newQuestion, skeleton_code: e.target.value, type: 'coding'})}
                                                        style={{ fontFamily: 'monospace', fontSize: '12px', background: '#1e1e1e', color: '#d4d4d4' }}
                                                        placeholder="function solution() {\n  \n}"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Language</label>
                                                    <input 
                                                        className="form-input"
                                                        value={newQuestion.language || ''}
                                                        onChange={e => setNewQuestion({...newQuestion, language: e.target.value})}
                                                        placeholder="e.g. javascript"
                                                    />
                                                </div>
                                                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                        <label className="form-label" style={{ margin: 0 }}>Test Cases</label>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const tc = [...(newQuestion.test_cases || [])];
                                                                tc.push({ input: '', expected: '' });
                                                                setNewQuestion({...newQuestion, test_cases: tc});
                                                            }}
                                                            style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '6px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                                                        >
                                                            + Add Case
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {(newQuestion.test_cases || []).map((tc, tidx) => (
                                                            <div key={tidx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '10px', alignItems: 'center' }}>
                                                                <input 
                                                                    className="form-input" 
                                                                    placeholder="Input" 
                                                                    value={tc.input} 
                                                                    onChange={e => {
                                                                        const newTc = [...(newQuestion.test_cases || [])];
                                                                        newTc[tidx].input = e.target.value;
                                                                        setNewQuestion({...newQuestion, test_cases: newTc});
                                                                    }}
                                                                    style={{ fontSize: '12px', height: '36px' }}
                                                                />
                                                                <input 
                                                                    className="form-input" 
                                                                    placeholder="Expected" 
                                                                    value={tc.expected} 
                                                                    onChange={e => {
                                                                        const newTc = [...(newQuestion.test_cases || [])];
                                                                        newTc[tidx].expected = e.target.value;
                                                                        setNewQuestion({...newQuestion, test_cases: newTc});
                                                                    }}
                                                                    style={{ fontSize: '12px', height: '36px' }}
                                                                />
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        const newTc = (newQuestion.test_cases || []).filter((_, i) => i !== tidx);
                                                                        setNewQuestion({...newQuestion, test_cases: newTc});
                                                                    }}
                                                                    style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', height: '36px', cursor: 'pointer' }}
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                             </div>
                                        ) : (
                                            (newQuestion.options || []).map((opt, idx) => (
                                                <div key={idx} className="option-input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 16px' }}>
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
                                                        style={{ border: 'none', background: 'transparent', padding: '10px 0', flexGrow: 1, color: 'var(--text)' }}
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
                                            ))
                                        )}
                                    </div>

                                    <div className="form-section-title" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '32px' }}>
                                        ADDITIONAL DETAILS
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Explanation (Optional)</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={2}
                                            placeholder="Explain why this answer is correct..."
                                            value={newQuestion.explanation || ''}
                                            onChange={e => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                                            style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text)', height: 'auto', minHeight: '80px', fontSize: '15px' }}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer" style={{ background: 'var(--bg-sunken)', borderTop: '1px solid var(--border)', padding: '24px 32px', borderRadius: '0 0 24px 24px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    style={{ padding: '12px 28px', borderRadius: '14px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 800, fontSize: '14px', color: 'var(--text)', minWidth: '100px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    form="add-q-form"
                                    type="submit"
                                    style={{
                                        padding: '12px 28px', borderRadius: '14px', background: 'var(--primary)', color: 'white',
                                        border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '14px',
                                        boxShadow: 'var(--shadow-primary)', minWidth: '160px'
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
                {/* â”€â”€ Quick Add Category Modal â”€â”€ */}
                {isQuickAdding && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '480px', background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                            <div className="modal-header" style={{ borderBottom: 'none', padding: '32px 32px 14px' }}>
                                <h3 className="modal-title" style={{ color: 'var(--text)', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                                    <Icons.Category /> New Category
                                </h3>
                            </div>
                            <div className="modal-body" style={{ padding: '0 32px 32px' }}>
                                <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px', fontWeight: 500 }}>
                                    Create a new folder to organize your questions.
                                </p>
                                <form id="quick-add-cat-form" onSubmit={handleQuickCreate}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ color: 'var(--text)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800 }}>
                                            CATEGORY NAME
                                        </label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. Cognitive Psychology"
                                            value={quickCategoryName}
                                            onChange={e => setQuickCategoryName(e.target.value)}
                                            required
                                            autoFocus
                                            style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text)', height: '52px', fontSize: '15px' }}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer" style={{ background: 'var(--bg-sunken)', borderTop: '1px solid var(--border)', padding: '24px 32px', borderRadius: '0 0 24px 24px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsQuickAdding(false)}
                                    style={{ padding: '12px 28px', borderRadius: '14px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 800, fontSize: '14px', color: 'var(--text)', minWidth: '100px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    form="quick-add-cat-form"
                                    type="submit"
                                    style={{
                                        padding: '12px 28px', borderRadius: '14px', background: 'var(--primary)', color: 'white',
                                        border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '14px',
                                        boxShadow: 'var(--shadow-primary)', minWidth: '160px'
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

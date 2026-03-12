

export type PopupType = 'alert' | 'confirm';

export interface CustomPopupProps {
    isOpen: boolean;
    type: PopupType;
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

export default function CustomPopup({
    isOpen,
    type,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "OK",
    cancelText = "Cancel"
}: CustomPopupProps) {
    if (!isOpen) return null;

    return (
        <div className="custom-popup-overlay">
            <div className="custom-popup-box">
                {title && <h3 className="custom-popup-title">{title}</h3>}
                <div className="custom-popup-message">{message}</div>
                <div className="custom-popup-actions">
                    {type === 'confirm' && (
                        <button className="custom-popup-btn cancel-btn" onClick={onCancel}>
                            {cancelText}
                        </button>
                    )}
                    <button className="custom-popup-btn confirm-btn" onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
            <style>{`
                .custom-popup-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(6px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    animation: overlayIn 0.2s ease-out;
                }
                .custom-popup-box {
                    background: #ffffff;
                    width: 90%;
                    max-width: 420px;
                    border-radius: 16px;
                    padding: 32px 24px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                    animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    text-align: center;
                    border: 1px solid var(--border, #e2e8f0);
                }
                .custom-popup-title {
                    margin: 0 0 16px;
                    font-size: 20px;
                    color: var(--text, #1e293b);
                    font-weight: 800;
                    font-family: var(--font-heading, sans-serif);
                }
                .custom-popup-message {
                    font-size: 15px;
                    color: var(--text-muted, #64748b);
                    margin-bottom: 32px;
                    line-height: 1.6;
                    font-family: var(--font-body, sans-serif);
                }
                .custom-popup-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .custom-popup-btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: var(--font-body, sans-serif);
                }
                .confirm-btn {
                    background: var(--primary, #1c848f);
                    color: white;
                    box-shadow: 0 4px 12px rgba(28, 132, 143, 0.25);
                }
                .confirm-btn:hover {
                    background: var(--primary-hover, #156d77);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(28, 132, 143, 0.35);
                }
                .confirm-btn:active {
                    transform: translateY(0);
                }
                .cancel-btn {
                    background: var(--bg-neutral, #f8fafc);
                    color: var(--text, #1e293b);
                    border: 1px solid var(--border, #e2e8f0);
                }
                .cancel-btn:hover {
                    background: #e2e8f0;
                }
                @keyframes overlayIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalPop {
                    from { opacity: 0; transform: scale(0.9) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}

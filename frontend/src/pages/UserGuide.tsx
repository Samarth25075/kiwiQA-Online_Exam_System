import React, { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import heroImg from "../assets/guide-hero.png";

const UserGuide: React.FC = () => {
    const [activeSection, setActiveSection] = useState("overview");

    const sections = [
        { id: "overview", title: "Overview", icon: "🚀" },
        { id: "admin", title: "Administrator Guide", icon: "🛠️" },
        { id: "candidate", title: "Candidate Guide", icon: "🎓" },
        { id: "faq", title: "FAQ", icon: "❓" },
    ];

    const content: Record<string, React.ReactNode> = {
        overview: (
            <div className="guide-content-inner">
                <div className="guide-hero">
                    <div className="hero-text">
                        <h2>Welcome to ExamPortal 🚀</h2>
                        <p>ExamPortal is a sophisticated, AI-driven exam management system designed to streamline the assessment process while ensuring high integrity through advanced proctoring.</p>
                    </div>
                    <div className="hero-visual">
                        <img src={heroImg} alt="AI Exam Hero" className="hero-illustration" />
                    </div>
                </div>
                <div className="guide-features">
                    <div className="guide-feature-card">
                        <div className="feature-icon">🤖</div>
                        <h3>AI Generation</h3>
                        <p>Generate high-quality questions instantly using advanced AI models.</p>
                    </div>
                    <div className="guide-feature-card">
                        <div className="feature-icon">🛡️</div>
                        <h3>Smart Proctoring</h3>
                        <p>Webcam monitoring and tab-switch detection for maximum security.</p>
                    </div>
                    <div className="guide-feature-card">
                        <div className="feature-icon">📊</div>
                        <h3>Deep Analytics</h3>
                        <p>Comprehensive performance reports with category-wise breakdown.</p>
                    </div>
                </div>
            </div>
        ),
        admin: (
            <div className="guide-content-inner">
                <h2>Administrator Guide 🛠️</h2>
                
                <section>
                    <h3>1. Creating an Exam</h3>
                    <p>Navigate to <strong>"Create Exam"</strong>. You can choose different sources for your questions:</p>
                    <ul>
                        <li><strong>AI Path</strong>: Provide a subject and difficulty; the system handles the rest.</li>
                        <li><strong>Question Bank</strong>: Pull from your curated repository.</li>
                        <li><strong>Manual</strong>: Full control over every word and option.</li>
                        <li><strong>Upload</strong>: Import from JSON or CSV files for bulk creation.</li>
                    </ul>
                </section>

                <section>
                    <h3>2. Candidate Enrollment</h3>
                    <p>Once an exam is published, you can enroll candidates via <strong>"Manage Candidates"</strong>. Assign them to an exam, and they will receive a unique link.</p>
                </section>

                <section>
                    <h3>3. Reviewing Results</h3>
                    <p>The <strong>"Results"</strong> section provides detailed insights. You can see not just the score, but also the candidate's proctoring log and snapshots captured during the session.</p>
                </section>
            </div>
        ),
        candidate: (
            <div className="guide-content-inner">
                <h2>Candidate Guide 🎓</h2>
                <p>Ensure candidates are aware of these requirements for a smooth experience:</p>
                
                <section>
                    <h3>Preparation</h3>
                    <ul>
                        <li>Use a supported browser (Chrome, Edge, Safari).</li>
                        <li>Enable webcam and screen sharing permissions when prompted.</li>
                        <li>Ensure a stable internet connection.</li>
                    </ul>
                </section>

                <section>
                    <h3>During the Test</h3>
                    <p>The system monitors activity in real-time:</p>
                    <ul>
                        <li><strong>Tab Switching</strong>: Switching tabs or minimizing the browser will trigger a warning. Multiple attempts may terminate the exam.</li>
                        <li><strong>Face Detection</strong>: The candidate must remain in the camera frame.</li>
                        <li><strong>Timer</strong>: The exam will automatically submit when the timer hits zero.</li>
                    </ul>
                </section>
            </div>
        ),
        faq: (
            <div className="guide-content-inner">
                <h2>Frequently Asked Questions ❓</h2>
                
                <div className="faq-item">
                    <h4>Can I retake an exam?</h4>
                    <p>This is controlled by the Administrator. If permitted, a new link must be generated for the candidate.</p>
                </div>

                <div className="faq-item">
                    <h4>What if the camera fails?</h4>
                    <p>If proctoring is mandatory, the exam will not start. Check browser permissions and ensure the camera is not being used by another app.</p>
                </div>

                <div className="faq-item">
                    <h4>How is the AI grading done?</h4>
                    <p>Multiple-choice questions are graded automatically. Subjective analysis is performed by our AI based on the provided answer keys and knowledge base.</p>
                </div>
            </div>
        )
    };

    return (
        <AdminLayout>
            <style>{`
                .guide-page {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 32px;
                    padding: 32px;
                    max-width: 1400px;
                    margin: 0 auto;
                    animation: fadeIn 0.4s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 900px) {
                    .guide-page {
                        grid-template-columns: 1fr;
                    }
                }

                /* Sidebar Navigation */
                .guide-nav {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 16px;
                    height: fit-content;
                    position: sticky;
                    top: 32px;
                    box-shadow: var(--shadow-sm);
                }

                .guide-nav-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 18px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    color: var(--text-muted);
                    transition: all 0.2s;
                    margin-bottom: 4px;
                }

                .guide-nav-item:hover {
                    background: var(--bg-neutral);
                    color: var(--text);
                }

                .guide-nav-item.active {
                    background: var(--primary);
                    color: white;
                    box-shadow: 0 4px 12px rgba(28, 132, 143, 0.25);
                }

                .nav-icon {
                    font-size: 18px;
                }

                /* Content Area */
                .guide-content {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 48px;
                    box-shadow: var(--shadow);
                    min-height: 600px;
                }

                .guide-content-inner h2 {
                    font-family: var(--font-heading);
                    font-size: 36px;
                    font-weight: 800;
                    margin-bottom: 24px;
                    color: var(--text);
                    letter-spacing: -0.02em;
                }

                .guide-hero {
                    display: flex;
                    align-items: center;
                    gap: 32px;
                    margin-bottom: 40px;
                    background: linear-gradient(135deg, var(--bg-neutral) 0%, transparent 100%);
                    padding: 32px;
                    border-radius: 24px;
                    border: 1px solid var(--border);
                }

                .hero-text { flex: 1; }
.hero-visual { width: 300px; flex-shrink: 0; }
.hero-illustration { width: 100%; height: auto; border-radius: 12px; }

                .guide-content-inner h3 {
                    font-size: 20px;
                    font-weight: 700;
                    margin: 32px 0 16px;
                    color: var(--primary);
                }

                .guide-content-inner p {
                    font-size: 16px;
                    line-height: 1.7;
                    color: var(--text-muted);
                    margin-bottom: 20px;
                }

                .guide-content-inner ul {
                    padding-left: 20px;
                    margin-bottom: 24px;
                }

                .guide-content-inner li {
                    font-size: 15px;
                    color: var(--text-muted);
                    margin-bottom: 12px;
                    line-height: 1.5;
                }

                .guide-content-inner strong {
                    color: var(--text);
                }

                /* Feature Cards */
                .guide-features {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-top: 40px;
                }

                .guide-feature-card {
                    background: var(--bg-neutral);
                    padding: 24px;
                    border-radius: 16px;
                    border: 1px solid var(--border);
                    text-align: center;
                    transition: transform 0.2s;
                }

                .guide-feature-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--primary);
                }

                .feature-icon {
                    font-size: 32px;
                    margin-bottom: 16px;
                }

                .guide-feature-card h3 {
                    font-size: 17px;
                    margin: 0 0 12px;
                    color: var(--text);
                }

                .guide-feature-card p {
                    font-size: 14px;
                    margin: 0;
                }

                /* FAQ */
                .faq-item {
                    background: var(--bg-neutral);
                    padding: 24px;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    border: 1px solid var(--border);
                }

                .faq-item h4 {
                    font-size: 17px;
                    font-weight: 700;
                    margin: 0 0 12px;
                    color: var(--text);
                }

                .faq-item p {
                    font-size: 15px;
                    margin: 0;
                }
            `}</style>

            <div className="guide-page">
                <aside className="guide-nav">
                    {sections.map(s => (
                        <div
                            key={s.id}
                            className={`guide-nav-item ${activeSection === s.id ? "active" : ""}`}
                            onClick={() => setActiveSection(s.id)}
                        >
                            <span className="nav-icon">{s.icon}</span>
                            <span>{s.title}</span>
                        </div>
                    ))}
                </aside>

                <main className="guide-content">
                    {content[activeSection]}
                </main>
            </div>
        </AdminLayout>
    );
};

export default UserGuide;

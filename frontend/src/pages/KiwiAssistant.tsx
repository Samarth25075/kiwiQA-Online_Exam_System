import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "../components/AdminLayout";
import "./KiwiAssistant.css";

const KiwiAssistant: React.FC = () => {
    const [messages, setMessages] = useState<{ text: string; sender: "ai" | "user" }[]>([
        { text: "Hi! I'm KiwiAssistant 🥝. How can I help you navigate the system today?", sender: "ai" }
    ]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const knowledgeBase: Record<string, string> = {
        "create exam": "To create an exam, go to the <b>Create Exam</b> module. You can pick questions from the Question Bank, add them manually, or use the <b>Bulk Upload</b> feature (JSON/CSV).",
        "proctoring": "Our smart proctoring includes <b>Webcam monitoring</b>, <b>Face detection</b>, and <b>Tab-switch tracking</b>. If a candidate switches tabs, it's logged and they may be cautioned or eliminated.",
        "bulk import": "You can import questions using the <b>JSON/CSV Upload</b> tool in the 'Create Exam' module. Ensure your file follows the required schema as shown in the documentation.",
        "enrollment": "Candidates are managed in the <b>Candidate Management</b> section. You can enroll them individually, send email invites, and track their status in real-time.",
        "reports": "Detailed results are available in the <b>Results & Reports</b> section. You can view category-wise performance, proctoring logs, and pass/fail analysis for every candidate.",
        "master otp": "The <b>Master OTP</b> is a rotating code displayed on your Admin Dashboard. Share this with candidates during enrollment to verify their identity.",
        "default": "I'm sorry, I don't have a specific answer for that yet. Try asking about 'exams', 'proctoring', 'import', or 'results'! 🥝"
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (text: string = input) => {
        const msg = text.trim();
        if (!msg) return;

        const newMessages = [...messages, { text: msg, sender: "user" as const }];
        setMessages(newMessages);
        setInput("");

        const q = msg.toLowerCase();
        let answer = knowledgeBase["default"];
        
        if (q.includes("create") || q.includes("exam")) answer = knowledgeBase["create exam"];
        else if (q.includes("proctor") || q.includes("cheat") || q.includes("webcam")) answer = knowledgeBase["proctoring"];
        else if (q.includes("import") || q.includes("upload") || q.includes("bulk")) answer = knowledgeBase["bulk import"];
        else if (q.includes("candidate") || q.includes("enroll") || q.includes("manage")) answer = knowledgeBase["enrollment"];
        else if (q.includes("result") || q.includes("report") || q.includes("score")) answer = knowledgeBase["reports"];
        else if (q.includes("otp") || q.includes("code")) answer = knowledgeBase["master otp"];

        setTimeout(() => {
            setMessages(prev => [...prev, { text: answer, sender: "ai" }]);
        }, 600);
    };

    return (
        <AdminLayout>
            <div className="ka-container">
                <div className="ka-header">
                    <div className="ka-title">
                        <span className="ka-emoji">🤖</span>
                        <div>
                            <h2>KiwiAssistant</h2>
                            <p>AI Support Hub</p>
                        </div>
                    </div>
                </div>

                <div className="ka-chat-wrapper">
                    <div className="ka-messages" ref={scrollRef}>
                        {messages.map((m, i) => (
                            <div key={i} className={`ka-msg-row ${m.sender}`}>
                                <div className={`ka-msg-bubble ${m.sender}`} dangerouslySetInnerHTML={{ __html: m.text }} />
                            </div>
                        ))}
                    </div>

                    <div className="ka-suggestions">
                        <button onClick={() => handleSend("How do I create an exam?")}>Add Exam</button>
                        <button onClick={() => handleSend("How does the proctoring work?")}>Security</button>
                        <button onClick={() => handleSend("Tell me about results and reports")}>Reports</button>
                        <button onClick={() => handleSend("What is Master OTP?")}>OTP</button>
                    </div>

                    <div className="ka-input-area">
                        <input 
                            type="text" 
                            placeholder="Type your question..." 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSend()}
                        />
                        <button onClick={() => handleSend()}>Send</button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default KiwiAssistant;

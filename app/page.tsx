'use client';

import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function InternApplication() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    linkedin: '',
    instagram: '',
    video: null as File | null,
    scenario1: null as File | null,
    scenario2: null as File | null,
    scenario3: null as File | null,
    confirm1: false,
    confirm2: false,
    confirm3: false,
    confirm4: false,
  });

  const [fileNames, setFileNames] = useState({
    video: '',
    scenario1: '',
    scenario2: '',
    scenario3: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof typeof fileNames) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, [fieldName]: file }));
      setFileNames(prev => ({ ...prev, [fieldName]: file.name }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);

    const emailData = new FormData();
    
    // Add all form fields
    Object.keys(formData).forEach(key => {
      const value = formData[key as keyof typeof formData];
      if (value !== null) {
        emailData.append(key, value as string | Blob);
      }
    });

    try {
      // Using Formspree - replace YOUR_FORMSPREE_ID with actual ID
      const response = await fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
        method: 'POST',
        body: emailData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        setSubmitStatus('success');
        // Reset form
        setFormData({
          fullName: '',
          phone: '',
          linkedin: '',
          instagram: '',
          video: null,
          scenario1: null,
          scenario2: null,
          scenario3: null,
          confirm1: false,
          confirm2: false,
          confirm3: false,
          confirm4: false,
        });
        setFileNames({ video: '', scenario1: '', scenario2: '', scenario3: '' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      setSubmitStatus('error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const FileUploadBox = ({ id, fieldName, label, accept, icon: Icon }: {
    id: string;
    fieldName: keyof typeof fileNames;
    label: string;
    accept: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <div className="upload-box">
      <input
        type="file"
        id={id}
        accept={accept}
        onChange={(e) => handleFileChange(e, fieldName)}
        className="file-input"
        required
      />
      <label htmlFor={id} className="upload-label">
        <Icon className="upload-icon" />
        <div className="upload-text">
          <strong>{label}</strong>
          <span className="upload-hint">Click to browse or drag and drop</span>
        </div>
        {fileNames[fieldName] && (
          <div className="file-selected">
            <CheckCircle2 className="check-icon" />
            {fileNames[fieldName]}
          </div>
        )}
      </label>
    </div>
  );

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: #ffffff;
        }

        /* Header */
        .header {
          background: rgba(255, 255, 255, 0.98);
          border-bottom: 1px solid #e5e7eb;
          padding: 1.25rem 0;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(12px);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          font-size: 1.75rem;
          font-weight: 700;
          background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .nav {
          display: flex;
          gap: 2rem;
        }

        .nav a {
          color: #6b7280;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s;
        }

        .nav a:hover {
          color: #0066FF;
        }

        /* Hero */
        .hero {
          background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%);
          color: white;
          padding: 5rem 2rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .hero h1 {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .hero p {
          font-size: 1.35rem;
          opacity: 0.95;
          font-weight: 400;
        }

        /* Container */
        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 3rem 2rem;
        }

        /* Status Messages */
        .status-message {
          padding: 1.25rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          display: flex;
          align-items: start;
          gap: 1rem;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .status-message.success {
          background: #f0fdf4;
          border: 1px solid #86efac;
          color: #166534;
        }

        .status-message.error {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #991b1b;
        }

        .status-icon {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
        }

        /* Intro Box */
        .intro-box {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-left: 4px solid #0066FF;
          padding: 2rem;
          border-radius: 12px;
          margin-bottom: 2.5rem;
        }

        .intro-box h3 {
          color: #0066FF;
          font-size: 1.5rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .intro-box p {
          margin: 0.75rem 0;
          color: #374151;
        }

        .intro-box ol {
          margin: 1rem 0 1rem 1.5rem;
        }

        .intro-box li {
          margin: 0.5rem 0;
          color: #374151;
        }

        .emphasis {
          color: #0066FF;
          font-weight: 600;
        }

        /* Sections */
        .section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 2.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .section h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #0066FF;
        }

        .section h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin: 1.5rem 0 1rem;
        }

        /* Form Elements */
        .form-group {
          margin-bottom: 1.5rem;
        }

        label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #374151;
          font-size: 0.95rem;
        }

        input[type="text"],
        input[type="tel"],
        input[type="url"] {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          font-family: inherit;
          transition: all 0.2s;
          background: white;
        }

        input:focus {
          outline: none;
          border-color: #0066FF;
          box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.1);
        }

        /* Video Challenge */
        .video-challenge {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 2px solid #fbbf24;
          border-radius: 12px;
          padding: 2rem;
          margin: 1.5rem 0;
        }

        .video-challenge h3 {
          color: #d97706;
          margin-top: 0;
        }

        .video-challenge p {
          color: #92400e;
          margin: 0.75rem 0;
        }

        .stakes {
          font-weight: 600;
          color: #d97706;
          margin-top: 1rem;
        }

        /* Upload Box */
        .upload-box {
          position: relative;
          margin: 1rem 0;
        }

        .file-input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          overflow: hidden;
        }

        .upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem;
          border: 2px dashed #0066FF;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(0, 102, 255, 0.02) 0%, rgba(0, 102, 255, 0.05) 100%);
          cursor: pointer;
          transition: all 0.3s;
        }

        .upload-label:hover {
          background: linear-gradient(135deg, rgba(0, 102, 255, 0.05) 0%, rgba(0, 102, 255, 0.1) 100%);
          border-color: #0052CC;
          transform: translateY(-2px);
        }

        .upload-icon {
          width: 48px;
          height: 48px;
          color: #0066FF;
          margin-bottom: 1rem;
        }

        .upload-text {
          text-align: center;
        }

        .upload-text strong {
          display: block;
          font-size: 1.1rem;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .upload-hint {
          font-size: 0.9rem;
          color: #6b7280;
        }

        .file-selected {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          color: #10b981;
          font-weight: 500;
        }

        .check-icon {
          width: 20px;
          height: 20px;
        }

        /* Scenarios */
        .scenario {
          background: #fafafa;
          border-radius: 12px;
          padding: 2rem;
          margin: 1.5rem 0;
          border: 1px solid #e5e7eb;
        }

        .contact-box {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          padding: 1.25rem;
          border-radius: 10px;
          margin: 1rem 0;
          font-weight: 600;
          border-left: 4px solid #0066FF;
        }

        .objectives {
          background: #f0fdf4;
          padding: 1.25rem;
          border-radius: 10px;
          margin: 1rem 0;
          border-left: 4px solid #10b981;
        }

        .objectives p {
          margin: 0.5rem 0;
        }

        .objectives strong {
          color: #10b981;
        }

        /* Important Notice */
        .important {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-left: 4px solid #ef4444;
          padding: 1.5rem;
          border-radius: 10px;
          margin: 1.5rem 0;
        }

        .important strong {
          color: #dc2626;
          display: block;
          margin-bottom: 0.75rem;
          font-size: 1.05rem;
        }

        .important ul {
          margin: 0.75rem 0 0 1.5rem;
        }

        .important li {
          margin: 0.5rem 0;
          color: #991b1b;
        }

        /* Checkboxes */
        .checkbox-group {
          margin: 1.5rem 0;
        }

        .checkbox-item {
          display: flex;
          align-items: start;
          margin: 1rem 0;
          padding: 0.875rem;
          border-radius: 10px;
          transition: background 0.2s;
          cursor: pointer;
        }

        .checkbox-item:hover {
          background: rgba(0, 102, 255, 0.03);
        }

        .checkbox-item input[type="checkbox"] {
          width: 1.25rem;
          height: 1.25rem;
          margin: 0.125rem 0.75rem 0 0;
          cursor: pointer;
          accent-color: #0066FF;
          flex-shrink: 0;
        }

        .checkbox-item label {
          margin: 0;
          cursor: pointer;
          font-weight: 400;
        }

        /* Submit Button */
        .submit-button {
          background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%);
          color: white;
          border: none;
          padding: 1.125rem 3rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          width: 100%;
          font-family: inherit;
          margin-top: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          box-shadow: 0 4px 16px rgba(0, 102, 255, 0.2);
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 102, 255, 0.3);
        }

        .submit-button:disabled {
          background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Footer */
        .footer {
          background: #111827;
          color: white;
          padding: 3rem 2rem;
          text-align: center;
          margin-top: 4rem;
        }

        .footer a {
          color: white;
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .footer a:hover {
          opacity: 0.8;
        }

        /* What Happens Next */
        .next-steps {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 16px;
          padding: 2.5rem;
          margin-top: 3rem;
        }

        .next-steps h2 {
          color: #0369a1;
          border-bottom: 2px solid #0369a1;
        }

        .next-steps ul {
          margin: 1.5rem 0 1.5rem 1.5rem;
        }

        .next-steps li {
          margin: 1rem 0;
          color: #075985;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero h1 {
            font-size: 2.25rem;
          }

          .hero p {
            font-size: 1.1rem;
          }

          .section {
            padding: 1.5rem;
          }

          .container {
            padding: 2rem 1rem;
          }

          .nav {
            display: none;
          }

          .header-content {
            padding: 0 1rem;
          }
        }
      `}</style>

      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="logo">Trailblaize</div>
            <nav className="nav">
              <a href="https://trailblaize.net/#about">About</a>
              <a href="https://trailblaize.net/#features">Features</a>
              <a href="https://trailblaize.net/#pricing">Pricing</a>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="hero">
          <div className="hero-content">
            <h1>Join the Trailblaize Team</h1>
            <p>We're looking for 5 exceptional individuals to help us revolutionize alumni engagement</p>
          </div>
        </section>

        {/* Main Content */}
        <div className="container">
          {submitStatus === 'success' && (
            <div className="status-message success">
              <CheckCircle2 className="status-icon" />
              <div>
                <strong>Application Submitted Successfully!</strong>
                <p style={{ margin: '0.25rem 0 0 0' }}>
                  Thank you for applying! We've received your application and will review it carefully. 
                  Selected candidates will be contacted within 5 business days.
                </p>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="status-message error">
              <AlertCircle className="status-icon" />
              <div>
                <strong>Submission Error</strong>
                <p style={{ margin: '0.25rem 0 0 0' }}>
                  There was an error submitting your application. Please try again or email your 
                  application directly to owen@trailblaize.net
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Introduction */}
            <div className="intro-box">
              <h3>About This Opportunity</h3>
              <p>
                Trailblaize is revolutionizing how organizations connect with their communities and grow their networks. 
                We're building something special, and we need driven, resourceful individuals who thrive in high-energy 
                environments and aren't afraid to pick up the phone.
              </p>
              
              <p style={{ marginTop: '1rem' }}><strong>What We're Looking For:</strong></p>
              <p>
                We're hiring a select group of interns (<span className="emphasis">5 positions from 50+ applicants</span>) 
                to join our growth team. You'll be working on two critical initiatives:
              </p>
              <ol>
                <li><strong>Alumni Engagement</strong> - Connecting with communities through personalized outreach</li>
                <li><strong>Business Development</strong> - Generating new opportunities and building relationships</li>
              </ol>
              
              <p style={{ marginTop: '1rem' }}>
                This isn't your typical internship. We reward performance, initiative, and results. If you're someone 
                who loves the challenge of turning "no" into "yes" and building genuine connections, keep reading.
              </p>
            </div>

            {/* Section 1: Basic Information */}
            <div className="section">
              <h2>Section 1: Basic Information</h2>
              <div className="form-group">
                <label htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Section 2: Video Challenge */}
            <div className="section">
              <h2>Section 2: Video Challenge (25 Seconds)</h2>
              
              <div className="video-challenge">
                <h3>The $100 Million Question</h3>
                <p>
                  Imagine this scenario: You have exactly 25 seconds to describe yourself to someone who cannot see you. 
                  They can only hear your voice. After listening to you, they'll spend a week observing 100 different 
                  people going about their daily lives. At the end of that week, they need to identify YOU based solely 
                  on what you told them in those 25 seconds.
                </p>
                
                <p className="stakes">
                  The stakes? If they pick you correctly, you win $100 million. If they pick anyone else, 
                  you walk away with nothing.
                </p>
              </div>
              
              <p>
                <strong>Your Task:</strong><br />
                Record a 25-second video describing yourself. Don't tell us what you do—tell us{' '}
                <span className="emphasis">WHO you are</span>. What traits, habits, patterns, or qualities make you 
                uniquely identifiable? What would make you stand out in that crowd of 100?
              </p>
              
              <FileUploadBox
                id="videoUpload"
                fieldName="video"
                label="Upload your 25-second video"
                accept="video/*"
                icon={Camera}
              />
            </div>

            {/* Section 3: Sales Challenge */}
            <div className="section">
              <h2>Section 3: Sales Challenge</h2>
              
              <p>
                This is where we see what you're made of. Below are three real scenarios. You must complete{' '}
                <span className="emphasis">ALL THREE calls/texts</span> and submit proof of your outreach.
              </p>
              
              <div className="important">
                <strong>Important Notes:</strong>
                <ul>
                  <li>You can call or text these numbers</li>
                  <li>Be professional, creative, and persistent</li>
                  <li>If they say no, <strong>ask for a referral</strong> (this is critical)</li>
                  <li>Screenshot or record your interactions as proof</li>
                  <li>Upload evidence of each attempt</li>
                </ul>
              </div>

              {/* Scenario 1 */}
              <div className="scenario">
                <h3>Scenario 1: The Charitable Heart</h3>
                <div className="contact-box">
                  Contact: Adam Perez<br />
                  Phone: 720-557-2438
                </div>
                
                <p><strong>Your Role:</strong> You're a fundraiser for a charity of your choice (pick one that resonates with you)</p>
                
                <div className="objectives">
                  <p><strong>Primary Objective:</strong> Get Adam to commit to a $10 donation</p>
                  <p><strong>Backup Objective:</strong> If he declines, ask for a referral to someone who might be interested in supporting this cause</p>
                </div>
                
                <FileUploadBox
                  id="scenario1Upload"
                  fieldName="scenario1"
                  label="Upload proof of outreach (screenshot/recording)"
                  accept="image/*,video/*"
                  icon={Upload}
                />
              </div>

              {/* Scenario 2 */}
              <div className="scenario">
                <h3>Scenario 2: The Software Sale</h3>
                <div className="contact-box">
                  Contact: Ford Hudson<br />
                  Phone: 601-832-6655
                </div>
                
                <p><strong>Your Role:</strong> You're the owner of a software company (you choose what the software does—make it relevant to startups)</p>
                
                <div className="objectives">
                  <p><strong>Primary Objective:</strong> Book a meeting with Ford to discuss how your software could benefit his startup</p>
                  <p><strong>Backup Objective:</strong> If he declines, ask if there's someone else in his organization who handles software/tools decisions that he could refer you to</p>
                </div>
                
                <FileUploadBox
                  id="scenario2Upload"
                  fieldName="scenario2"
                  label="Upload proof of outreach (screenshot/recording)"
                  accept="image/*,video/*"
                  icon={Upload}
                />
              </div>

              {/* Scenario 3 */}
              <div className="scenario">
                <h3>Scenario 3: The Product Pitch</h3>
                <div className="contact-box">
                  Contact: Anonymous<br />
                  Phone: 601-826-3085
                </div>
                
                <p><strong>Your Role:</strong> You're selling a product in the $25-50 range (your choice—be creative)</p>
                
                <div className="objectives">
                  <p><strong>Primary Objective:</strong> Get them to commit to purchasing the product</p>
                  <p><strong>Backup Objective:</strong> If they decline for any reason, ask for a referral to someone who might need/want this product</p>
                </div>
                
                <FileUploadBox
                  id="scenario3Upload"
                  fieldName="scenario3"
                  label="Upload proof of outreach (screenshot/recording)"
                  accept="image/*,video/*"
                  icon={Upload}
                />
              </div>
            </div>

            {/* Section 4: Final Details */}
            <div className="section">
              <h2>Section 4: Final Details</h2>
              <div className="form-group">
                <label htmlFor="linkedin">LinkedIn Profile URL *</label>
                <input
                  type="url"
                  id="linkedin"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/yourprofile"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="instagram">Instagram Handle *</label>
                <input
                  type="text"
                  id="instagram"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  placeholder="@yourhandle"
                  required
                />
              </div>

              <div className="checkbox-group">
                <h3>Confirmation</h3>
                <p>By submitting this form, I confirm that:</p>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="confirm1"
                    name="confirm1"
                    checked={formData.confirm1}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="confirm1">I completed all three sales scenarios</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="confirm2"
                    name="confirm2"
                    checked={formData.confirm2}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="confirm2">All information provided is accurate</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="confirm3"
                    name="confirm3"
                    checked={formData.confirm3}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="confirm3">I understand this is a performance-based opportunity</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="confirm4"
                    name="confirm4"
                    checked={formData.confirm4}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="confirm4">I'm ready to start immediately if selected</label>
                </div>
              </div>
            </div>

            <button type="submit" className="submit-button" disabled={submitting}>
              {submitting ? (
                <>
                  Submitting...
                  <Loader2 className="spinner" />
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          </form>

          {/* What Happens Next */}
          <div className="next-steps">
            <h2>What Happens Next?</h2>
            <p>We'll review all applications and select 5 candidates who demonstrate:</p>
            <ul>
              <li><strong>Initiative</strong> - You actually completed the challenges</li>
              <li><strong>Creativity</strong> - Your approach was thoughtful and unique</li>
              <li><strong>Persistence</strong> - You asked for referrals when faced with rejection</li>
              <li><strong>Authenticity</strong> - Your 25-second video showed us the real you</li>
            </ul>
            
            <p style={{ marginTop: '1.5rem' }}>
              <span className="emphasis">Selected candidates will be contacted within 5 business days for next steps.</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer">
          <p style={{ marginBottom: '1rem' }}>© 2025 Trailblaize, Inc. All rights reserved.</p>
          <p><a href="mailto:support@trailblaize.net">support@trailblaize.net</a></p>
        </footer>
      </div>
    </>
  );
}

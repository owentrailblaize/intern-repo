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
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <a href="https://trailblaize.net" className="logo">
            <img src="/logo.svg" alt="Trailblaize" className="logo-img" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>Join the Trailblaize<br />Team.</h1>
          <p>We&apos;re looking for 5 exceptional individuals to help us revolutionize alumni engagement.</p>
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
                Thank you for applying! We&apos;ve received your application and will review it carefully. 
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
              We&apos;re building something special, and we need driven, resourceful individuals who thrive in high-energy 
              environments and aren&apos;t afraid to pick up the phone.
            </p>
            
            <p style={{ marginTop: '1rem' }}><strong>What We&apos;re Looking For:</strong></p>
            <p>
              We&apos;re hiring a select group of interns (<span className="emphasis">5 positions from 50+ applicants</span>) 
              to join our growth team. You&apos;ll be working on two critical initiatives:
            </p>
            <ol>
              <li><strong>Alumni Engagement</strong> - Connecting with communities through personalized outreach</li>
              <li><strong>Business Development</strong> - Generating new opportunities and building relationships</li>
            </ol>
            
            <p style={{ marginTop: '1rem' }}>
              This isn&apos;t your typical internship. We reward performance, initiative, and results. If you&apos;re someone 
              who loves the challenge of turning &quot;no&quot; into &quot;yes&quot; and building genuine connections, keep reading.
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
                They can only hear your voice. After listening to you, they&apos;ll spend a week observing 100 different 
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
              Record a 25-second video describing yourself. Don&apos;t tell us what you do—tell us{' '}
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
              This is where we see what you&apos;re made of. Below are three real scenarios. You must complete{' '}
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
              
              <p><strong>Your Role:</strong> You&apos;re a fundraiser for a charity of your choice (pick one that resonates with you)</p>
              
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
              
              <p><strong>Your Role:</strong> You&apos;re the owner of a software company (you choose what the software does—make it relevant to startups)</p>
              
              <div className="objectives">
                <p><strong>Primary Objective:</strong> Book a meeting with Ford to discuss how your software could benefit his startup</p>
                <p><strong>Backup Objective:</strong> If he declines, ask if there&apos;s someone else in his organization who handles software/tools decisions that he could refer you to</p>
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
              
              <p><strong>Your Role:</strong> You&apos;re selling a product in the $25-50 range (your choice—be creative)</p>
              
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
                <label htmlFor="confirm4">I&apos;m ready to start immediately if selected</label>
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
          <p>We&apos;ll review all applications and select 5 candidates who demonstrate:</p>
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
        <p>© 2025 Trailblaize, Inc. · <a href="mailto:support@trailblaize.net">support@trailblaize.net</a></p>
      </footer>
    </div>
  );
}

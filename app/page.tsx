<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Intern Application | Trailblaize</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #0066FF;
            --primary-dark: #0052CC;
            --text-primary: #1a1a1a;
            --text-secondary: #666;
            --background: #ffffff;
            --surface: #f8f9fa;
            --border: #e1e8ed;
            --success: #10b981;
            --warning: #f59e0b;
            --error: #ef4444;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--background);
        }

        /* Header */
        .header {
            background: var(--background);
            border-bottom: 1px solid var(--border);
            padding: 1.5rem 0;
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.95);
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
            font-family: 'DM Sans', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--primary);
            text-decoration: none;
        }

        .nav-links {
            display: flex;
            gap: 2rem;
            align-items: center;
        }

        .nav-links a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.9rem;
            transition: color 0.2s;
        }

        .nav-links a:hover {
            color: var(--primary);
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%);
            color: white;
            padding: 4rem 2rem;
            text-align: center;
        }

        .hero h1 {
            font-family: 'DM Sans', sans-serif;
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
            line-height: 1.2;
        }

        .hero p {
            font-size: 1.25rem;
            opacity: 0.9;
            max-width: 800px;
            margin: 0 auto;
        }

        /* Container */
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 3rem 2rem;
        }

        /* Section Styles */
        .section {
            background: var(--surface);
            border-radius: 12px;
            padding: 2.5rem;
            margin-bottom: 2rem;
            border: 1px solid var(--border);
        }

        .section h2 {
            font-family: 'DM Sans', sans-serif;
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--primary);
        }

        .section h3 {
            font-family: 'DM Sans', sans-serif;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 1.5rem 0 1rem;
        }

        /* Intro Box */
        .intro-box {
            background: white;
            border-left: 4px solid var(--primary);
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }

        .intro-box h3 {
            margin-top: 0;
            color: var(--primary);
        }

        .intro-box ul {
            margin: 1rem 0 1rem 1.5rem;
        }

        .intro-box li {
            margin: 0.5rem 0;
        }

        /* Form Elements */
        .form-group {
            margin-bottom: 1.5rem;
        }

        label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }

        input[type="text"],
        input[type="tel"],
        input[type="email"],
        input[type="url"],
        textarea {
            width: 100%;
            padding: 0.875rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 1rem;
            font-family: inherit;
            transition: all 0.2s;
            background: white;
        }

        input:focus,
        textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
        }

        /* Video Challenge Box */
        .video-challenge {
            background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
            border: 2px solid var(--warning);
            border-radius: 12px;
            padding: 2rem;
            margin: 1.5rem 0;
        }

        .video-challenge h3 {
            color: #d97706;
            margin-top: 0;
        }

        .video-challenge .stakes {
            font-weight: 600;
            color: #d97706;
            margin-top: 1rem;
        }

        /* Upload Area */
        .upload-area {
            border: 2px dashed var(--primary);
            background: rgba(0, 102, 255, 0.03);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            margin: 1rem 0;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
        }

        .upload-area:hover {
            background: rgba(0, 102, 255, 0.08);
            border-color: var(--primary-dark);
        }

        .upload-area input[type="file"] {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            opacity: 0;
            cursor: pointer;
        }

        .upload-icon {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        .file-name {
            margin-top: 0.5rem;
            color: var(--success);
            font-weight: 500;
        }

        /* Scenario Cards */
        .scenario {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin: 1.5rem 0;
            border: 1px solid var(--border);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .contact-box {
            background: linear-gradient(135deg, #e8f4f8 0%, #d1e7f0 100%);
            padding: 1.25rem;
            border-radius: 8px;
            margin: 1rem 0;
            font-weight: 600;
            border-left: 4px solid var(--primary);
        }

        .objectives {
            background: #f0fdf4;
            padding: 1.25rem;
            border-radius: 8px;
            margin: 1rem 0;
            border-left: 4px solid var(--success);
        }

        .objectives p {
            margin: 0.5rem 0;
        }

        .objectives strong {
            color: var(--success);
        }

        /* Important Notice */
        .important {
            background: #fef2f2;
            border-left: 4px solid var(--error);
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1.5rem 0;
        }

        .important strong {
            color: var(--error);
            display: block;
            margin-bottom: 0.5rem;
        }

        .important ul {
            margin: 0.75rem 0 0 1.5rem;
        }

        .important li {
            margin: 0.5rem 0;
        }

        /* Checkboxes */
        .checkbox-group {
            margin: 1.5rem 0;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            margin: 1rem 0;
            padding: 0.75rem;
            border-radius: 8px;
            transition: background 0.2s;
        }

        .checkbox-item:hover {
            background: rgba(0, 102, 255, 0.03);
        }

        .checkbox-item input[type="checkbox"] {
            width: 1.25rem;
            height: 1.25rem;
            margin-right: 0.75rem;
            cursor: pointer;
            accent-color: var(--primary);
        }

        .checkbox-item label {
            margin: 0;
            cursor: pointer;
            font-weight: 400;
        }

        /* Submit Button */
        .submit-button {
            background: var(--primary);
            color: white;
            border: none;
            padding: 1rem 3rem;
            font-size: 1.1rem;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            width: 100%;
            font-family: inherit;
            margin-top: 2rem;
        }

        .submit-button:hover:not(:disabled) {
            background: var(--primary-dark);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 102, 255, 0.3);
        }

        .submit-button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        /* Success/Error Messages */
        .message {
            padding: 1.25rem;
            border-radius: 8px;
            margin: 1.5rem 0;
            display: none;
        }

        .message.success {
            background: #f0fdf4;
            border: 1px solid var(--success);
            color: #065f46;
            display: block;
        }

        .message.error {
            background: #fef2f2;
            border: 1px solid var(--error);
            color: #991b1b;
            display: block;
        }

        /* Footer */
        .footer {
            background: var(--text-primary);
            color: white;
            padding: 3rem 2rem;
            text-align: center;
            margin-top: 4rem;
        }

        .footer a {
            color: white;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        /* Emphasis */
        .emphasis {
            color: var(--primary);
            font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2rem;
            }

            .hero p {
                font-size: 1rem;
            }

            .section {
                padding: 1.5rem;
            }

            .container {
                padding: 2rem 1rem;
            }

            .nav-links {
                display: none;
            }
        }

        /* Loading Spinner */
        .spinner {
            border: 3px solid rgba(0, 102, 255, 0.1);
            border-top: 3px solid var(--primary);
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            display: inline-block;
            margin-left: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="header-content">
            <a href="https://trailblaize.net" class="logo">Trailblaize</a>
            <nav class="nav-links">
                <a href="https://trailblaize.net/#about">About</a>
                <a href="https://trailblaize.net/#features">Features</a>
                <a href="https://trailblaize.net/#pricing">Pricing</a>
            </nav>
        </div>
    </header>

    <!-- Hero -->
    <section class="hero">
        <h1>Join the Trailblaize Team</h1>
        <p>We're looking for 5 exceptional individuals to help us revolutionize alumni engagement</p>
    </section>

    <!-- Main Content -->
    <div class="container">
        <div id="successMessage" class="message success" style="display: none;">
            <strong>🎉 Application Submitted Successfully!</strong><br>
            Thank you for applying! We've received your application and will review it carefully. Selected candidates will be contacted within 5 business days.
        </div>

        <div id="errorMessage" class="message error" style="display: none;"></div>

        <form id="internForm">
            <!-- Introduction -->
            <div class="intro-box">
                <h3>About This Opportunity</h3>
                <p>Trailblaize is revolutionizing how organizations connect with their communities and grow their networks. We're building something special, and we need driven, resourceful individuals who thrive in high-energy environments and aren't afraid to pick up the phone.</p>
                
                <p style="margin-top: 1rem;"><strong>What We're Looking For:</strong></p>
                <p>We're hiring a select group of interns (<span class="emphasis">5 positions from 50+ applicants</span>) to join our growth team. You'll be working on two critical initiatives:</p>
                <ol>
                    <li><strong>Alumni Engagement</strong> - Connecting with communities through personalized outreach</li>
                    <li><strong>Business Development</strong> - Generating new opportunities and building relationships</li>
                </ol>
                
                <p style="margin-top: 1rem;">This isn't your typical internship. We reward performance, initiative, and results. If you're someone who loves the challenge of turning "no" into "yes" and building genuine connections, keep reading.</p>
            </div>

            <!-- Section 1: Basic Information -->
            <div class="section">
                <h2>Section 1: Basic Information</h2>
                <div class="form-group">
                    <label for="fullName">Full Name *</label>
                    <input type="text" id="fullName" name="fullName" required>
                </div>
                <div class="form-group">
                    <label for="phone">Phone Number *</label>
                    <input type="tel" id="phone" name="phone" required>
                </div>
            </div>

            <!-- Section 2: Video Challenge -->
            <div class="section">
                <h2>Section 2: Video Challenge (25 Seconds)</h2>
                
                <div class="video-challenge">
                    <h3>The $100 Million Question</h3>
                    <p>Imagine this scenario: You have exactly 25 seconds to describe yourself to someone who cannot see you. They can only hear your voice. After listening to you, they'll spend a week observing 100 different people going about their daily lives. At the end of that week, they need to identify YOU based solely on what you told them in those 25 seconds.</p>
                    
                    <p class="stakes">The stakes? If they pick you correctly, you win $100 million. If they pick anyone else, you walk away with nothing.</p>
                </div>
                
                <p><strong>Your Task:</strong><br>
                Record a 25-second video describing yourself. Don't tell us what you do—tell us <span class="emphasis">WHO you are</span>. What traits, habits, patterns, or qualities make you uniquely identifiable? What would make you stand out in that crowd of 100?</p>
                
                <div class="upload-area" onclick="document.getElementById('videoUpload').click()">
                    <div class="upload-icon">📹</div>
                    <strong>Upload your 25-second video</strong>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">Click to browse or drag and drop</p>
                    <input type="file" id="videoUpload" name="video" accept="video/*" required>
                    <div id="videoFileName" class="file-name"></div>
                </div>
            </div>

            <!-- Section 3: Sales Challenge -->
            <div class="section">
                <h2>Section 3: Sales Challenge</h2>
                
                <p>This is where we see what you're made of. Below are three real scenarios. You must complete <span class="emphasis">ALL THREE calls/texts</span> and submit proof of your outreach.</p>
                
                <div class="important">
                    <strong>Important Notes:</strong>
                    <ul>
                        <li>You can call or text these numbers</li>
                        <li>Be professional, creative, and persistent</li>
                        <li>If they say no, <strong>ask for a referral</strong> (this is critical)</li>
                        <li>Screenshot or record your interactions as proof</li>
                        <li>Upload evidence of each attempt</li>
                    </ul>
                </div>

                <!-- Scenario 1 -->
                <div class="scenario">
                    <h3>Scenario 1: The Charitable Heart</h3>
                    <div class="contact-box">
                        Contact: Adam Perez<br>
                        Phone: 720-557-2438
                    </div>
                    
                    <p><strong>Your Role:</strong> You're a fundraiser for a charity of your choice (pick one that resonates with you)</p>
                    
                    <div class="objectives">
                        <p><strong>Primary Objective:</strong> Get Adam to commit to a $10 donation</p>
                        <p><strong>Backup Objective:</strong> If he declines, ask for a referral to someone who might be interested in supporting this cause</p>
                    </div>
                    
                    <div class="upload-area" onclick="document.getElementById('scenario1Upload').click()">
                        <div class="upload-icon">📸</div>
                        <strong>Upload proof of outreach</strong>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">Screenshot or recording</p>
                        <input type="file" id="scenario1Upload" name="scenario1" accept="image/*,video/*" required>
                        <div id="scenario1FileName" class="file-name"></div>
                    </div>
                </div>

                <!-- Scenario 2 -->
                <div class="scenario">
                    <h3>Scenario 2: The Software Sale</h3>
                    <div class="contact-box">
                        Contact: Ford Hudson<br>
                        Phone: 601-832-6655
                    </div>
                    
                    <p><strong>Your Role:</strong> You're the owner of a software company (you choose what the software does—make it relevant to startups)</p>
                    
                    <div class="objectives">
                        <p><strong>Primary Objective:</strong> Book a meeting with Ford to discuss how your software could benefit his startup</p>
                        <p><strong>Backup Objective:</strong> If he declines, ask if there's someone else in his organization who handles software/tools decisions that he could refer you to</p>
                    </div>
                    
                    <div class="upload-area" onclick="document.getElementById('scenario2Upload').click()">
                        <div class="upload-icon">📸</div>
                        <strong>Upload proof of outreach</strong>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">Screenshot or recording</p>
                        <input type="file" id="scenario2Upload" name="scenario2" accept="image/*,video/*" required>
                        <div id="scenario2FileName" class="file-name"></div>
                    </div>
                </div>

                <!-- Scenario 3 -->
                <div class="scenario">
                    <h3>Scenario 3: The Product Pitch</h3>
                    <div class="contact-box">
                        Contact: Anonymous<br>
                        Phone: 601-826-3085
                    </div>
                    
                    <p><strong>Your Role:</strong> You're selling a product in the $25-50 range (your choice—be creative)</p>
                    
                    <div class="objectives">
                        <p><strong>Primary Objective:</strong> Get them to commit to purchasing the product</p>
                        <p><strong>Backup Objective:</strong> If they decline for any reason, ask for a referral to someone who might need/want this product</p>
                    </div>
                    
                    <div class="upload-area" onclick="document.getElementById('scenario3Upload').click()">
                        <div class="upload-icon">📸</div>
                        <strong>Upload proof of outreach</strong>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">Screenshot or recording</p>
                        <input type="file" id="scenario3Upload" name="scenario3" accept="image/*,video/*" required>
                        <div id="scenario3FileName" class="file-name"></div>
                    </div>
                </div>
            </div>

            <!-- Section 4: Final Details -->
            <div class="section">
                <h2>Section 4: Final Details</h2>
                <div class="form-group">
                    <label for="linkedin">LinkedIn Profile URL *</label>
                    <input type="url" id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/yourprofile" required>
                </div>
                <div class="form-group">
                    <label for="instagram">Instagram Handle *</label>
                    <input type="text" id="instagram" name="instagram" placeholder="@yourhandle" required>
                </div>

                <div class="checkbox-group">
                    <h3>Confirmation</h3>
                    <p>By submitting this form, I confirm that:</p>
                    <div class="checkbox-item">
                        <input type="checkbox" id="confirm1" required>
                        <label for="confirm1">I completed all three sales scenarios</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="confirm2" required>
                        <label for="confirm2">All information provided is accurate</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="confirm3" required>
                        <label for="confirm3">I understand this is a performance-based opportunity</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="confirm4" required>
                        <label for="confirm4">I'm ready to start immediately if selected</label>
                    </div>
                </div>
            </div>

            <button type="submit" class="submit-button" id="submitBtn">
                Submit Application
            </button>
        </form>

        <!-- What Happens Next -->
        <div class="section" style="margin-top: 3rem;">
            <h2>What Happens Next?</h2>
            <p>We'll review all applications and select 5 candidates who demonstrate:</p>
            <ul style="margin-left: 1.5rem; margin-top: 1rem;">
                <li style="margin: 0.75rem 0;"><strong>Initiative</strong> - You actually completed the challenges</li>
                <li style="margin: 0.75rem 0;"><strong>Creativity</strong> - Your approach was thoughtful and unique</li>
                <li style="margin: 0.75rem 0;"><strong>Persistence</strong> - You asked for referrals when faced with rejection</li>
                <li style="margin: 0.75rem 0;"><strong>Authenticity</strong> - Your 25-second video showed us the real you</li>
            </ul>
            
            <p style="margin-top: 1.5rem;"><span class="emphasis">Selected candidates will be contacted within 5 business days for next steps.</span></p>
        </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
        <p style="margin-bottom: 1rem;">© 2025 Trailblaize, Inc. All rights reserved.</p>
        <p><a href="mailto:support@trailblaize.net">support@trailblaize.net</a></p>
    </footer>

    <script>
        // File upload preview
        const fileInputs = [
            { input: 'videoUpload', display: 'videoFileName' },
            { input: 'scenario1Upload', display: 'scenario1FileName' },
            { input: 'scenario2Upload', display: 'scenario2FileName' },
            { input: 'scenario3Upload', display: 'scenario3FileName' }
        ];

        fileInputs.forEach(({ input, display }) => {
            document.getElementById(input).addEventListener('change', function(e) {
                const fileName = e.target.files[0]?.name;
                const displayElement = document.getElementById(display);
                if (fileName) {
                    displayElement.textContent = `✓ ${fileName}`;
                    displayElement.style.display = 'block';
                }
            });
        });

        // Form submission
        document.getElementById('internForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Submitting... <span class="spinner"></span>';
            
            // Hide any previous messages
            document.getElementById('successMessage').style.display = 'none';
            document.getElementById('errorMessage').style.display = 'none';

            const formData = new FormData(this);
            
            try {
                // Using Formspree for email handling
                const response = await fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    document.getElementById('successMessage').style.display = 'block';
                    this.reset();
                    // Clear file name displays
                    fileInputs.forEach(({ display }) => {
                        document.getElementById(display).textContent = '';
                        document.getElementById(display).style.display = 'none';
                    });
                    // Scroll to success message
                    document.getElementById('successMessage').scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    throw new Error('Submission failed');
                }
            } catch (error) {
                const errorMsg = document.getElementById('errorMessage');
                errorMsg.textContent = 'There was an error submitting your application. Please try again or email your application directly to owen@trailblaize.net';
                errorMsg.style.display = 'block';
                errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    </script>
</body>
</html>

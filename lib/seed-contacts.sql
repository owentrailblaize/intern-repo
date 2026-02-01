-- Seed data for Network Contacts
-- Run this AFTER running database.sql

INSERT INTO network_contacts (name, title, organization, phone, contact_type, priority, stage, how_they_can_help, notes) VALUES

-- Greek University / Consultants
('Dr. Michael R. Ayalon', 'CEO/Founder', 'Greek University', '(203) 58-GREEK', 'consultant', 'hot', 'identified', 
 'Major connector in Greek life industry. Could provide introductions to IFC chapters nationwide.',
 'Runs Greek University - key industry player'),

('Tom Murphy', 'IFC Reboot Consultant', 'Greek University', '(609) 220-4975', 'consultant', 'hot', 'identified',
 'Direct access to struggling IFCs looking for new solutions. Could be partnership or referral source.',
 'Works on IFC turnarounds - perfect timing for our product'),

('Dr. Louis Profeta', 'Professional Speaker', 'Greek University', '(203) 58-GREEK', 'connector', 'warm', 'identified',
 'Speaking engagements at Greek events. Could introduce us to chapter presidents.',
 'Popular speaker in Greek life circuit'),

-- Industry / Business Dev
('Tony Kehoe', 'National Business Development Manager', 'Vantine Composites', '(315) 750-5371', 'connector', 'warm', 'identified',
 'Experience selling to nationals. Understands enterprise Greek sales.',
 'B2B experience in Greek adjacent industry'),

('Aaron C. Parker', 'Vice President', 'OmegaFi/Pennington & Company', '(785) 218-3921', 'competitor', 'hot', 'identified',
 'Deep knowledge of Greek financial software. Potential partnership or acquisition insight.',
 'OmegaFi is major player in Greek chapter management'),

-- Investors / Angels
('Rogers Healy', 'Morrison Seger / Angel Investor', NULL, '(214) 207-9580', 'angel', 'hot', 'identified',
 'Active angel investor. Could lead or participate in seed round.',
 'Angel investor - need to research portfolio'),

('Eric Priamo', 'Juniper Equity / Angel Investor', 'Juniper Equity', NULL, 'angel', 'hot', 'identified',
 'Angel investor. Could provide capital and strategic guidance.',
 'Need to find contact info'),

('Sam Dethrow', 'Angel Investor / Connector', 'Ole Miss Network', NULL, 'angel', 'hot', 'identified',
 'Ole Miss connections + angel capital. Greek life background likely.',
 'Connector at Ole Miss - strong Greek presence'),

('Jonathan Randall', 'Associate', 'Capital Factory', NULL, 'vc', 'warm', 'identified',
 'VC associate - could make intro to partners. Austin startup ecosystem.',
 'Capital Factory is major Austin accelerator'),

-- Deal Flow / Finance
('Ewing Gillaspy', 'M&A / iBanking / Deal Sourcing', NULL, NULL, 'connector', 'warm', 'identified',
 'M&A expertise. Could help with future fundraising or exit strategy. LP identification skills.',
 'Investment banking background - LP identification'),

('Robert Perry', 'Director of Sales - Eastern Region', 'Bluberi Gaming', NULL, 'connector', 'cold', 'identified',
 'Enterprise sales experience. Could provide sales strategy advice.',
 'Gaming industry but strong sales background');

-- Mark some as needing contact info research
UPDATE network_contacts 
SET notes = notes || ' | ACTION: Need to find email/LinkedIn'
WHERE email IS NULL AND linkedin IS NULL;

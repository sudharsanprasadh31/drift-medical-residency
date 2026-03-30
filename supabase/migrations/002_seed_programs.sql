-- Seed sample programs for testing
-- In production, you would have all 5000+ programs

INSERT INTO programs (program_name, specialty, location, program_director, program_coordinator) VALUES
    ('Massachusetts General Hospital - Internal Medicine', 'Internal Medicine', 'Boston, MA', 'Dr. Sarah Johnson', 'Emily Williams'),
    ('Johns Hopkins Hospital - General Surgery', 'General Surgery', 'Baltimore, MD', 'Dr. Michael Chen', 'Robert Martinez'),
    ('Mayo Clinic - Anesthesiology', 'Anesthesiology', 'Rochester, MN', 'Dr. Jennifer Davis', 'Lisa Anderson'),
    ('Cleveland Clinic - Cardiology', 'Cardiology', 'Cleveland, OH', 'Dr. David Thompson', 'Mark Wilson'),
    ('Stanford Health Care - Emergency Medicine', 'Emergency Medicine', 'Stanford, CA', 'Dr. Amanda Rodriguez', 'Jessica Taylor'),
    ('UCLA Medical Center - Pediatrics', 'Pediatrics', 'Los Angeles, CA', 'Dr. Christopher Lee', 'Michelle Brown'),
    ('UCSF Medical Center - Neurology', 'Neurology', 'San Francisco, CA', 'Dr. Patricia White', 'Daniel Garcia'),
    ('NewYork-Presbyterian Hospital - Psychiatry', 'Psychiatry', 'New York, NY', 'Dr. James Harris', 'Sarah Moore'),
    ('Duke University Hospital - Orthopedic Surgery', 'Orthopedic Surgery', 'Durham, NC', 'Dr. Elizabeth Martin', 'Kevin Jackson'),
    ('University of Pennsylvania - Dermatology', 'Dermatology', 'Philadelphia, PA', 'Dr. Richard Thomas', 'Laura Thompson'),
    ('Northwestern Memorial Hospital - Radiology', 'Radiology', 'Chicago, IL', 'Dr. Susan Anderson', 'Brian Miller'),
    ('Cedars-Sinai Medical Center - Obstetrics and Gynecology', 'Obstetrics and Gynecology', 'Los Angeles, CA', 'Dr. Mary Wilson', 'Jennifer Davis'),
    ('Barnes-Jewish Hospital - Neurosurgery', 'Neurosurgery', 'St. Louis, MO', 'Dr. William Taylor', 'Thomas Robinson'),
    ('Mount Sinai Hospital - Gastroenterology', 'Gastroenterology', 'New York, NY', 'Dr. Barbara Clark', 'Nancy Lewis'),
    ('University of Michigan Health - Family Medicine', 'Family Medicine', 'Ann Arbor, MI', 'Dr. Robert Hall', 'Steven Walker'),
    ('UPMC Presbyterian - Pulmonology', 'Pulmonology', 'Pittsburgh, PA', 'Dr. Linda Young', 'Carol Allen'),
    ('Brigham and Women''s Hospital - Endocrinology', 'Endocrinology', 'Boston, MA', 'Dr. Charles King', 'Patricia Wright'),
    ('Memorial Sloan Kettering - Hematology/Oncology', 'Hematology/Oncology', 'New York, NY', 'Dr. Margaret Scott', 'Donald Green'),
    ('MD Anderson Cancer Center - Radiation Oncology', 'Radiation Oncology', 'Houston, TX', 'Dr. Joseph Lopez', 'Sharon Baker'),
    ('UTSW Medical Center - Nephrology', 'Nephrology', 'Dallas, TX', 'Dr. Nancy Hill', 'George Adams'),
    ('Vanderbilt University Medical Center - Infectious Disease', 'Infectious Disease', 'Nashville, TN', 'Dr. Thomas Nelson', 'Betty Carter'),
    ('University of Washington Medical Center - Rheumatology', 'Rheumatology', 'Seattle, WA', 'Dr. Paul Mitchell', 'Dorothy Phillips'),
    ('Yale New Haven Hospital - Ophthalmology', 'Ophthalmology', 'New Haven, CT', 'Dr. Karen Campbell', 'Joshua Evans'),
    ('Emory University Hospital - Physical Medicine and Rehabilitation', 'Physical Medicine and Rehabilitation', 'Atlanta, GA', 'Dr. Lisa Parker', 'Ryan Turner'),
    ('University of Chicago Medical Center - Allergy and Immunology', 'Allergy and Immunology', 'Chicago, IL', 'Dr. Steven Edwards', 'Michelle Collins'),
    ('University of Virginia Health - Urology', 'Urology', 'Charlottesville, VA', 'Dr. Mark Stewart', 'Kimberly Morris'),
    ('University of Alabama at Birmingham - Vascular Surgery', 'Vascular Surgery', 'Birmingham, AL', 'Dr. Daniel Sanchez', 'Angela Rogers'),
    ('Ohio State University Wexner Medical Center - Thoracic Surgery', 'Thoracic Surgery', 'Columbus, OH', 'Dr. Sandra Reed', 'Christopher Cook'),
    ('University of Colorado Hospital - Geriatrics', 'Geriatrics', 'Aurora, CO', 'Dr. Kenneth Cook', 'Rebecca Morgan'),
    ('Oregon Health & Science University - Sports Medicine', 'Sports Medicine', 'Portland, OR', 'Dr. Jessica Bell', 'Andrew Bailey'),
    ('University of Iowa Hospitals - Pathology', 'Pathology', 'Iowa City, IA', 'Dr. Brian Murphy', 'Melissa Rivera'),
    ('University of Minnesota Medical Center - Sleep Medicine', 'Sleep Medicine', 'Minneapolis, MN', 'Dr. Carol Cooper', 'Timothy Cooper'),
    ('University of Wisconsin Hospital - Nuclear Medicine', 'Nuclear Medicine', 'Madison, WI', 'Dr. Gary Richardson', 'Amanda Howard'),
    ('University of North Carolina Hospitals - Plastic Surgery', 'Plastic Surgery', 'Chapel Hill, NC', 'Dr. Sharon Cox', 'Justin Ward'),
    ('University of Arizona Medical Center - Pediatric Surgery', 'Pediatric Surgery', 'Tucson, AZ', 'Dr. Larry Howard', 'Stephanie Torres'),
    ('University of Florida Health - Otolaryngology', 'Otolaryngology', 'Gainesville, FL', 'Dr. Deborah Ward', 'Eric Peterson'),
    ('University of Kansas Hospital - Clinical Genetics', 'Clinical Genetics', 'Kansas City, KS', 'Dr. Jerry Torres', 'Heather Gray'),
    ('University of Kentucky Medical Center - Hospice and Palliative Medicine', 'Hospice and Palliative Medicine', 'Lexington, KY', 'Dr. Janet Peterson', 'Aaron Ramirez'),
    ('Medical University of South Carolina - General Surgery', 'General Surgery', 'Charleston, SC', 'Dr. Ralph James', 'Christina James'),
    ('Wake Forest Baptist Medical Center - Internal Medicine', 'Internal Medicine', 'Winston-Salem, NC', 'Dr. Alice Watson', 'Kyle Brooks');

-- Create admin user (you'll need to manually update this with actual UUID after creating admin account)
-- This is a placeholder - in production, create the admin account first, then run this
-- UPDATE profiles SET role = 'admin', is_approved = true WHERE email = 'admin@drift.com';

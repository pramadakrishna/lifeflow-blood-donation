# LifeFlow – Blood Donation Network

Web application that helps connect blood donors with people who need blood — while checking basic health safety rules during registration.

## What this project does

- Lets people register as blood donors
- Asks simple health questions to decide if they can donate now
- Shows whether someone is eligible 🟢, temporarily not able 🟡, or not eligible 🔴
- Allows searching donors by blood group, city and current health status
- Lets donors update their health status later
- Shows live numbers: total donors, estimated lives helped, blood group distribution

## Main features

- Step-by-step registration form with progress bar
- Real-time field checking (age, weight, phone, email…)
- Automatic eligibility decision after health questions
- Simple card list of donors with filters
- Protected contact details (only shown with consent)
- Mobile-friendly design
- Basic statistics on home page (updated without refresh)

## Technologies used

- **Frontend**: HTML, CSS, Bootstrap 5, Font Awesome, jQuery, AOS (animations)
- **Backend**: Python + Flask
- **Database**: PostgreSQL
- **Templates**: Jinja2

## Folder structure
Blood-donate/
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── register.html
│   ├── donors.html
│   ├── success.html
│   └── update_health.html
├── app.py
├── requirements.txt
├── README.md
└── screenshots/
      ├── home.png
      ├── register.png
      ├── donors.png
      ├── success.png
      └── update_health.png


## How to run the project locally

### Requirements

- Python 3.8 or newer
- PostgreSQL (version 12 or higher recommended)
- Git (optional)

### Steps

1. Clone or download the project
2. install the requirements.txt
3. Create a PostgreSQL database
4. Edit app.py and set your database credentials.
5. Start the application using command python app.py
6. Open in browser https://localhost:5000

<img src="screenshots/home.png" alt="Home">
Shows total donors, estimated lives helped, blood group chart and quick register button
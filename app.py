import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, render_template, request, redirect, url_for, g, jsonify
from datetime import date

app = Flask(__name__)

# --- DATABASE CONNECTION (FIXED FOR RENDER) ---
def get_db():
    if 'db' not in g:
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            raise Exception("DATABASE_URL not set")

        g.db = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    return g.db

@app.teardown_appcontext
def close_connection(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# --- INIT DB ---
def init_db():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS donors (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            blood_group TEXT NOT NULL,
            age INTEGER NOT NULL,
            city TEXT NOT NULL,
            weight INTEGER,
            is_first_time INTEGER DEFAULT 0,
            last_donation_date TEXT,
            health_status TEXT DEFAULT 'eligible',
            health_notes TEXT,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    db.commit()

# --- HEALTH CHECK ---
def evaluate_health(form_data):
    status = 'eligible'
    reasons = []
    
    age = int(form_data.get('age', 0))
    weight = int(form_data.get('weight', 0)) if form_data.get('weight') else 0
    
    if age < 18 or age > 65:
        status = 'not_eligible'
        reasons.append('Age must be between 18-65 years')
    
    if weight < 50:
        status = 'not_eligible'
        reasons.append('Weight must be at least 50 kg')
    
    if form_data.get('has_fever') == 'yes':
        status = 'temporarily_inactive' if status == 'eligible' else status
        reasons.append('Recent fever/illness (wait 2 weeks)')
    
    if form_data.get('has_chronic_disease') == 'yes':
        status = 'not_eligible'
        reasons.append('Chronic disease detected')
    
    if form_data.get('on_medication') == 'yes':
        status = 'temporarily_inactive' if status == 'eligible' else status
        reasons.append('Currently on prescription medication')
    
    if form_data.get('recent_surgery') == 'yes':
        status = 'temporarily_inactive' if status == 'eligible' else status
        reasons.append('Recent surgery (wait 6 months)')
    
    if form_data.get('recent_tattoo') == 'yes':
        status = 'temporarily_inactive' if status == 'eligible' else status
        reasons.append('Recent tattoo/piercing (wait 6 months)')
    
    if form_data.get('recent_travel') == 'yes':
        status = 'temporarily_inactive' if status == 'eligible' else status
        reasons.append('Recent travel to malaria-risk area')
    
    if form_data.get('pregnant_breastfeeding') == 'yes':
        status = 'temporarily_inactive' if status == 'eligible' else status
        reasons.append('Pregnancy or breastfeeding')
    
    return status, reasons

# --- ROUTES ---
@app.route('/')
def home():
    stats = get_stats().json
    return render_template('index.html', stats=stats)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        phone = request.form['phone']
        blood_group = request.form['blood_group']
        age = int(request.form['age'])
        city = request.form['city']
        weight = int(request.form['weight']) if request.form.get('weight') else None
        is_first_time = 1 if request.form.get('first_time') else 0
        last_date = request.form.get('last_date') if not is_first_time else None
        health_notes = request.form.get('health_notes', '')
        
        health_status, rejection_reasons = evaluate_health(request.form)
        
        if health_status != 'eligible':
            return render_template('register.html', 
                                 error=True, 
                                 rejection_reasons=rejection_reasons,
                                 form_data=request.form,
                                 today=date.today().isoformat())
        
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            INSERT INTO donors (name, email, phone, blood_group, age, city, weight, 
                              is_first_time, last_donation_date, health_status, health_notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (name, email, phone, blood_group, age, city, weight, 
              is_first_time, last_date, health_status, health_notes))
        db.commit()
        return redirect(url_for('success'))

    return render_template('register.html', error=False, today=date.today().isoformat())

@app.route('/success')
def success():
    return render_template('success.html')

@app.route('/donors')
def donors():
    blood_filter = request.args.get('blood_group', '')
    city_filter = request.args.get('city', '')
    health_filter = request.args.get('health_status', '')
    
    db = get_db()
    cursor = db.cursor()
    
    query = 'SELECT * FROM donors WHERE 1=1'
    params = []
    
    if blood_filter:
        query += ' AND blood_group = %s'
        params.append(blood_filter)
    if city_filter:
        query += ' AND city LIKE %s'
        params.append(f'%{city_filter}%')
    if health_filter:
        query += ' AND health_status = %s'
        params.append(health_filter)
    
    query += ' ORDER BY id DESC'
    cursor.execute(query, params)
    all_donors = cursor.fetchall()
    
    cursor.execute('SELECT DISTINCT city FROM donors ORDER BY city')
    cities = [row['city'] for row in cursor.fetchall()]
    
    return render_template('donors.html', donors=all_donors, cities=cities, 
                         selected_blood=blood_filter, selected_city=city_filter)

@app.route('/donor/update-health/<int:id>', methods=['GET', 'POST'])
def update_health(id):
    db = get_db()
    cursor = db.cursor()
    
    if request.method == 'POST':
        cursor.execute('SELECT * FROM donors WHERE id = %s', (id,))
        donor = cursor.fetchone()
        
        form_data = request.form.to_dict()
        form_data['age'] = donor['age']
        
        health_status, rejection_reasons = evaluate_health(form_data)
        health_notes = request.form.get('health_notes', '')
        
        cursor.execute('''
            UPDATE donors SET health_status = %s, health_notes = %s WHERE id = %s
        ''', (health_status, health_notes, id))
        db.commit()
        
        if health_status != 'eligible':
            return render_template('update_health.html', 
                                 donor=donor,
                                 updated=True,
                                 not_eligible=True,
                                 rejection_reasons=rejection_reasons,
                                 health_status=health_status)
        
        return redirect(url_for('donors'))
    
    cursor.execute('SELECT * FROM donors WHERE id = %s', (id,))
    donor = cursor.fetchone()
    
    return render_template('update_health.html', 
                         donor=donor, 
                         updated=False,
                         today=date.today().isoformat())

@app.route('/api/stats')
def get_stats():
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('SELECT COUNT(*) as total FROM donors')
    total = cursor.fetchone()['total']
    
    lives = total * 3
    
    cursor.execute('SELECT blood_group, COUNT(*) as count FROM donors GROUP BY blood_group')
    blood_data = {row['blood_group']: row['count'] for row in cursor.fetchall()}
    
    return jsonify({
        'total_donors': total,
        'lives_saved': lives,
        'blood_distribution': blood_data
    })

# --- ENTRY POINT ---
if __name__ == '__main__':
    with app.app_context():
        init_db()
    
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
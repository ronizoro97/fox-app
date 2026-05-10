from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3, json, os, random

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'fox-super-secret-2026-xK9mP')

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'fox.db')

def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name     TEXT NOT NULL,
            email    TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )''')
        conn.commit()

init_db()

def load_movies():
    path = os.path.join(os.path.dirname(__file__), 'static', 'movies.json')
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    movies = load_movies()
    categories = {}
    for m in movies:
        cat = m['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(m)
    top_movies = [m for m in movies if m['category'] != 'Games' and float(m.get('imdb') or 0) >= 8.0]
    top_movie = random.choice(top_movies) if top_movies else movies[0]
    return render_template('index.html', categories=categories, top_movie=top_movie,
                           user_name=session.get('user_name'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('index'))
    if request.method == 'POST':
        email    = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        with get_db() as conn:
            user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
        if user and check_password_hash(user['password'], password):
            session['user_id']   = user['id']
            session['user_name'] = user['name']
            return redirect(url_for('index'))
        flash('Invalid email or password', 'error')
    movies = load_movies()
    categories = {}
    for m in movies:
        cat = m['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(m)
    return render_template('login.html', categories=categories)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name     = request.form.get('name', '').strip()
        email    = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm  = request.form.get('confirm', '')
        if not name or not email or not password:
            flash('All fields are required', 'error')
        elif password != confirm:
            flash('Passwords do not match', 'error')
        else:
            try:
                with get_db() as conn:
                    conn.execute('INSERT INTO users (name,email,password) VALUES (?,?,?)',
                                 (name, email, generate_password_hash(password)))
                    conn.commit()
                flash('Account created! Please log in.', 'success')
                return redirect(url_for('login'))
            except sqlite3.IntegrityError:
                flash('Email already registered', 'error')
    return render_template('login.html', categories=load_movies(), open_tab='register')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/static/posters/<path:filename>')
def serve_poster(filename):
    return send_from_directory(
        os.path.join(os.path.dirname(__file__), 'static', 'posters'), filename)

@app.route('/movie/<int:movie_id>')
def movie_detail(movie_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    movies = load_movies()
    movie  = next((m for m in movies if m['id'] == movie_id), None)
    if not movie:
        return redirect(url_for('index'))
    if movie.get('category') == 'Games':
        return redirect(url_for('game_detail', game_id=movie_id))
    related = [m for m in movies if m['category'] == movie['category'] and m['id'] != movie_id][:6]
    return render_template('movie_detail.html', movie=movie, related=related,
                           user_name=session.get('user_name'))

@app.route('/game/<int:game_id>')
def game_detail(game_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    movies = load_movies()
    game   = next((m for m in movies if m['id'] == game_id), None)
    if not game:
        return redirect(url_for('games'))
    related = [m for m in movies if m['category'] == 'Games' and m['id'] != game_id][:6]
    return render_template('game_detail.html', game=game, related=related,
                           user_name=session.get('user_name'))

@app.route('/browse')
def browse():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    movies   = load_movies()
    category = request.args.get('category', 'All')
    mtype    = request.args.get('type', 'All')
    search   = request.args.get('q', '').strip().lower()
    filtered = movies
    if category != 'All':
        filtered = [m for m in filtered if m['category'] == category]
    if mtype != 'All':
        filtered = [m for m in filtered if m['type'] == mtype]
    if search:
        filtered = [m for m in filtered if
                    search in m['title'].lower() or
                    search in m.get('genre','').lower() or
                    search in m.get('cast','').lower() or
                    search in m.get('developer','').lower()]
    categories = sorted(set(m['category'] for m in movies))
    return render_template('browse.html', movies=filtered, categories=categories,
                           selected_cat=category, selected_type=mtype, search=search,
                           user_name=session.get('user_name'))

@app.route('/games')
def games():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    movies    = load_movies()
    all_games = [m for m in movies if m['category'] == 'Games']
    return render_template('games.html', games=all_games, user_name=session.get('user_name'))

@app.route('/ai')
def ai_page():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('ai.html', user_name=session.get('user_name'))

@app.route('/api/movies')
def api_movies():
    return jsonify(load_movies())

@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)

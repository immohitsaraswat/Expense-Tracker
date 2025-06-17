# app.py
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import os
import uuid # For generating unique user IDs if not using a proper DB

app = Flask(__name__)
# Set a secret key for session management.
# In a production environment, use a strong, randomly generated key from an environment variable.
app.secret_key = os.urandom(24) 

# --- In-memory Data Storage (for demonstration purposes) ---
# In a real application, you would use a database (e.g., SQLite, PostgreSQL, MongoDB)
# to persist user and expense data.

# Stores user credentials: {username: {password: "hashed_password", user_id: "uuid"}}
users = {} 
# Stores expenses: {user_id: [{id: "uuid", amount: float, category: str, date: str, description: str}]}
expenses = {} 

# --- Routes ---

@app.route('/')
def home():
    """
    Redirects to the login page.
    """
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """
    Handles user login.
    GET: Renders the login/registration page.
    POST: Authenticates the user.
    """
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        user_data = users.get(username)
        if user_data and user_data['password'] == password: # In production, use password hashing (e.g., bcrypt)
            session['user_id'] = user_data['user_id']
            session['username'] = username
            return jsonify({'success': True, 'message': 'Login successful!'})
        else:
            return jsonify({'success': False, 'message': 'Invalid username or password.'}), 401
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    """
    Handles user registration.
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required.'}), 400

    if username in users:
        return jsonify({'success': False, 'message': 'Username already exists. Please choose another.'}), 409
    
    user_id = str(uuid.uuid4()) # Generate a unique ID for the new user
    users[username] = {'password': password, 'user_id': user_id}
    expenses[user_id] = [] # Initialize an empty expense list for the new user
    
    session['user_id'] = user_id
    session['username'] = username
    return jsonify({'success': True, 'message': 'Registration successful!'})

@app.route('/dashboard')
def dashboard():
    """
    Renders the expense tracker dashboard. Requires user to be logged in.
    This version renders the new dashboard_records.html.
    """
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html', username=session['username'])

@app.route('/add_expense', methods=['POST'])
def add_expense():
    """
    Adds a new expense for the logged-in user.
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id = session['user_id']
    data = request.get_json()
    
    amount = data.get('amount')
    category = data.get('category')
    date = data.get('date')
    description = data.get('description')

    if not all([amount, category, date, description]):
        return jsonify({'success': False, 'message': 'All fields are required.'}), 400
    
    try:
        amount = float(amount)
    except ValueError:
        return jsonify({'success': False, 'message': 'Amount must be a number.'}), 400

    new_expense = {
        'id': str(uuid.uuid4()), # Unique ID for the expense
        'amount': amount,
        'category': category,
        'date': date,
        'description': description
    }
    
    expenses[user_id].append(new_expense)
    return jsonify({'success': True, 'message': 'Expense added successfully!', 'expense': new_expense})

@app.route('/get_expenses', methods=['GET'])
def get_expenses():
    """
    Retrieves all expenses for the logged-in user.
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    user_id = session['user_id']
    user_expenses = expenses.get(user_id, [])
    return jsonify({'success': True, 'expenses': user_expenses})

@app.route('/delete_expense/<string:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """
    Deletes an expense for the logged-in user.
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id = session['user_id']
    if user_id not in expenses:
        return jsonify({'success': False, 'message': 'User has no expenses.'}), 404

    initial_len = len(expenses[user_id])
    # Filter out the expense to be deleted
    expenses[user_id] = [e for e in expenses[user_id] if e['id'] != expense_id]

    if len(expenses[user_id]) < initial_len:
        return jsonify({'success': True, 'message': 'Expense deleted successfully!'})
    else:
        return jsonify({'success': False, 'message': 'Expense not found.'}), 404


@app.route('/logout')
def logout():
    """
    Logs out the user by clearing the session.
    """
    session.pop('user_id', None)
    session.pop('username', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    # Run the Flask app in debug mode.
    # For production, set debug=False and use a production-ready WSGI server like Gunicorn.
    app.run(debug=True)

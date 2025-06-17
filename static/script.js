// script.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const addExpenseForm = document.getElementById('add-expense-form');
    const expensesTableBody = document.getElementById('expenses-table-body');
    const messageBox = document.getElementById('message-box');
    const totalExpensesDisplay = document.getElementById('total-expenses-display');
    const expenseChartCanvas = document.getElementById('expense-chart');
    const chartMessage = document.getElementById('chart-message');
    const expenseAnalysisDiv = document.getElementById('expense-analysis');

    let expenseChart = null; // To hold the Chart.js instance

    // Function to display messages (success/error)
    function showMessage(message, type) {
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`; // Add type class for styling
        messageBox.classList.remove('hidden');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 5000); // Hide after 5 seconds
    }

    // --- Login/Register Page Logic ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginForm.elements['login-username'].value;
            const password = loginForm.elements['login-password'].value;

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();
                if (data.success) {
                    showMessage(data.message, 'success');
                    window.location.href = '/dashboard'; // Redirect to dashboard on success
                } else {
                    showMessage(data.message, 'error');
                }
            } catch (error) {
                console.error('Error during login:', error);
                showMessage('An error occurred during login. Please try again.', 'error');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerForm.elements['register-username'].value;
            const password = registerForm.elements['register-password'].value;

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();
                if (data.success) {
                    showMessage(data.message, 'success');
                    window.location.href = '/dashboard'; // Redirect to dashboard on success
                } else {
                    showMessage(data.message, 'error');
                }
            } catch (error) {
                console.error('Error during registration:', error);
                showMessage('An error occurred during registration. Please try again.', 'error');
            }
        });
    }

    // --- Dashboard Page Logic ---
    if (addExpenseForm) {
        addExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = addExpenseForm.elements['amount'].value;
            const category = addExpenseForm.elements['category'].value;
            const date = addExpenseForm.elements['date'].value;
            const description = addExpenseForm.elements['description'].value;

            try {
                const response = await fetch('/add_expense', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ amount, category, date, description }),
                });

                const data = await response.json();
                if (data.success) {
                    showMessage(data.message, 'success');
                    addExpenseForm.reset(); // Clear form fields
                    fetchExpenses(); // Refresh the expense list, total, chart, and analysis
                } else {
                    showMessage(data.message, 'error');
                }
            } catch (error) {
                console.error('Error adding expense:', error);
                showMessage('An error occurred while adding the expense. Please try again.', 'error');
            }
        });

        // Function to handle expense deletion
        async function deleteExpense(expenseId) {
            if (!confirm('Are you sure you want to delete this expense?')) {
                return; // User cancelled the deletion
            }

            try {
                const response = await fetch(`/delete_expense/${expenseId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();
                if (data.success) {
                    showMessage(data.message, 'success');
                    fetchExpenses(); // Refresh the expense list, total, chart, and analysis
                } else {
                    showMessage(data.message, 'error');
                }
            } catch (error) {
                console.error('Error deleting expense:', error);
                showMessage('An error occurred while deleting the expense. Please try again.', 'error');
            }
        }

        // Function to fetch and display expenses, calculate total, render chart, and perform analysis
        async function fetchExpenses() {
            try {
                const response = await fetch('/get_expenses');
                const data = await response.json();

                if (data.success) {
                    const expenses = data.expenses;
                    renderExpenses(expenses);
                    calculateAndDisplayTotal(expenses);
                    renderExpenseChart(expenses);
                    performAnalysis(expenses);
                } else {
                    showMessage(data.message, 'error');
                    expensesTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">${data.message}</td></tr>`; // Updated colspan
                    totalExpensesDisplay.textContent = '₹0.00';
                    if (expenseChart) {
                        expenseChart.destroy(); // Destroy existing chart if any
                        expenseChart = null;
                    }
                    chartMessage.classList.remove('hidden');
                    expenseAnalysisDiv.innerHTML = '<p id="analysis-message">Add expenses to see analysis.</p>';
                }
            } catch (error) {
                console.error('Error fetching expenses:', error);
                showMessage('An error occurred while fetching expenses. Please try again.', 'error');
                expensesTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">Failed to load expenses.</td></tr>`; // Updated colspan
                totalExpensesDisplay.textContent = '₹0.00';
                if (expenseChart) {
                    expenseChart.destroy();
                    expenseChart = null;
                }
                chartMessage.classList.remove('hidden');
                expenseAnalysisDiv.innerHTML = '<p id="analysis-message">Failed to load analysis.</p>';
            }
        }

        // Function to render expenses in the table
        function renderExpenses(expenses) {
            expensesTableBody.innerHTML = ''; // Clear existing rows

            if (expenses.length === 0) {
                expensesTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">No expenses added yet.</td></tr>`; // Updated colspan
                return;
            }

            // Sort expenses by date in descending order (newest first)
            expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

            expenses.forEach(expense => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="py-2 px-4">${expense.date}</td>
                    <td class="py-2 px-4">${expense.category}</td>
                    <td class="py-2 px-4">${expense.description}</td>
                    <td class="py-2 px-4 text-right">$${parseFloat(expense.amount).toFixed(2)}</td>
                    <td class="py-2 px-4 text-center">
                        <button class="text-red-500 hover:text-red-700 delete-btn" data-id="${expense.id}" title="Delete Expense">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                expensesTableBody.appendChild(row);
            });

            // Attach event listeners to all delete buttons
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const expenseId = e.currentTarget.dataset.id;
                    deleteExpense(expenseId);
                });
            });
        }

        // Function to calculate and display total expenses
        function calculateAndDisplayTotal(expenses) {
            const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
            totalExpensesDisplay.textContent = `₹${total.toFixed(2)}`;
        }

        // Function to render the expense chart
        function renderExpenseChart(expenses) {
            if (expenseChart) {
                expenseChart.destroy(); // Destroy existing chart before creating a new one
            }

            if (expenses.length === 0) {
                chartMessage.classList.remove('hidden');
                return;
            } else {
                chartMessage.classList.add('hidden');
            }

            // Aggregate data by category
            const categoryData = {};
            expenses.forEach(expense => {
                const category = expense.category;
                const amount = parseFloat(expense.amount);
                categoryData[category] = (categoryData[category] || 0) + amount;
            });

            const labels = Object.keys(categoryData);
            const data = Object.values(categoryData);

            // Generate random colors for the chart segments
            const backgroundColors = labels.map(() => {
                const r = Math.floor(Math.random() * 255);
                const g = Math.floor(Math.random() * 255);
                const b = Math.floor(Math.random() * 255);
                return `rgba(${r}, ${g}, ${b}, 0.7)`;
            });
            const borderColors = labels.map(color => color.replace('0.7', '1')); // More opaque border

            expenseChart = new Chart(expenseChartCanvas, {
                type: 'pie', // You can change this to 'bar' or 'doughnut'
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    family: 'Inter' // Apply Inter font to chart legend
                                }
                            }
                        },
                        title: {
                            display: false, // Title is handled by HTML h2
                        }
                    }
                }
            });
        }

        // Function to perform basic expense analysis
        function performAnalysis(expenses) {
            expenseAnalysisDiv.innerHTML = ''; // Clear previous analysis

            if (expenses.length === 0) {
                expenseAnalysisDiv.innerHTML = '<p id="analysis-message">Add expenses to see analysis.</p>';
                return;
            }

            const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

            // Calculate spending per category
            const categorySpending = {};
            expenses.forEach(expense => {
                const category = expense.category;
                const amount = parseFloat(expense.amount);
                categorySpending[category] = (categorySpending[category] || 0) + amount;
            });

            // Sort categories by spending amount (descending)
            const sortedCategories = Object.entries(categorySpending).sort(([, a], [, b]) => b - a);

            // Find the highest spending category
            let highestCategory = 'N/A';
            let highestAmount = 0;
            if (sortedCategories.length > 0) {
                highestCategory = sortedCategories[0][0];
                highestAmount = sortedCategories[0][1];
            }

            // Calculate average expense per item
            const averageExpensePerItem = expenses.length > 0 ? total / expenses.length : 0;

            let analysisHtml = `
                <p class="text-lg font-semibold mb-2">Overall Spending:</p>
                <ul class="list-disc list-inside space-y-1">
                    <li>Total number of expenses recorded: <span class="font-medium">${expenses.length}</span></li>
                    <li>Average expense per item: <span class="font-medium">₹${averageExpensePerItem.toFixed(2)}</span></li>
                    <li>Your highest spending category is: <span class="font-medium text-indigo-600">${highestCategory}</span> with a total of <span class="font-medium text-indigo-600">$${highestAmount.toFixed(2)}</span>.</li>
                </ul>

                <p class="text-lg font-semibold mt-4 mb-2">Spending Breakdown by Category:</p>
                <ul class="list-disc list-inside space-y-1">
            `;

            sortedCategories.forEach(([category, amount]) => {
                const percentage = (amount / total * 100).toFixed(2);
                analysisHtml += `<li>${category}: <span class="font-medium">₹${amount.toFixed(2)}</span> (${percentage}%)</li>`;
            });
            analysisHtml += `</ul>`;

            expenseAnalysisDiv.innerHTML = analysisHtml;
        }

        // Fetch expenses when the dashboard page loads
        fetchExpenses();
    }
});

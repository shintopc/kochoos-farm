
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                document.getElementById('loginMessage').textContent = error.message;
                document.getElementById('loginMessage').className = 'message error';
            } else {
                // Check user role and redirect accordingly
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();
                
                if (userError) {
                    document.getElementById('loginMessage').textContent = 'Error fetching user data';
                    document.getElementById('loginMessage').className = 'message error';
                } else {
                    if (userData.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'driver.html';
                    }
                }
            }
        });
    }
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }
    
    // Check if user is logged in on protected pages
    const protectedPages = ['admin.html', 'driver.html'];
    if (protectedPages.some(page => window.location.pathname.endsWith(page))) {
        const { data, error } = await supabase.auth.getUser();
        
        if (error || !data.user) {
            window.location.href = 'index.html';
        } else {
            // For admin.html, verify user is admin
            if (window.location.pathname.endsWith('admin.html')) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();
                
                if (userError || userData.role !== 'admin') {
                    window.location.href = 'index.html';
                }
            }
            
            // Set user name if available
            const driverNameElement = document.getElementById('driverName');
            if (driverNameElement) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', data.user.id)
                    .single();
                
                if (userData) {
                    driverNameElement.textContent = userData.name;
                }
            }
        }
    }
});

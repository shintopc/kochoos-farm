document.addEventListener('DOMContentLoaded', async () => {
    // Tab functionality
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and content
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab') + 'Tab';
            document.getElementById(tabId).classList.add('active');
            
            // Load data for the tab if needed
            if (tabId === 'deliveriesTab') {
                loadDeliveries();
            } else if (tabId === 'driversTab') {
                loadDrivers();
            } else if (tabId === 'dashboardTab') {
                loadDashboard();
            }
        });
    });
    
    // Load dashboard data
    async function loadDashboard() {
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's deliveries count
        const { count: deliveriesCount } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .eq('date', today);
        
        document.getElementById('todayDeliveriesCount').textContent = deliveriesCount || 0;
        
        // Get today's revenue
        const { data: revenueData } = await supabase
            .from('deliveries')
            .select('cash_collected')
            .eq('date', today);
        
        const todayRevenue = revenueData.reduce((sum, delivery) => sum + (delivery.cash_collected || 0), 0);
        document.getElementById('todayRevenue').textContent = `₹${todayRevenue.toFixed(2)}`;
        
        // Get pending payments
        const { data: pendingData } = await supabase
            .from('deliveries')
            .select('cash_pending')
            .gt('cash_pending', 0);
        
        const pendingPayments = pendingData.reduce((sum, delivery) => sum + (delivery.cash_pending || 0), 0);
        document.getElementById('pendingPayments').textContent = `₹${pendingPayments.toFixed(2)}`;
        
        // Get recent activity
        const { data: recentDeliveries } = await supabase
            .from('deliveries')
            .select(`
                *,
                users:driver_id (name)
            `)
            .order('created_at', { ascending: false })
            .limit(5);
        
        const activityContainer = document.getElementById('recentActivity');
        activityContainer.innerHTML = '';
        
        if (recentDeliveries && recentDeliveries.length > 0) {
            const ul = document.createElement('ul');
            recentDeliveries.forEach(delivery => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <strong>${delivery.users.name}</strong> delivered 
                    ${delivery.chicken_supplied || 0} chicken and 
                    ${delivery.feed_supplied || 0} kg feed to 
                    ${delivery.customer_name} (₹${delivery.cash_collected || 0})
                    <small>${delivery.date} ${delivery.time.substring(0, 5)}</small>
                `;
                ul.appendChild(li);
            });
            activityContainer.appendChild(ul);
        } else {
            activityContainer.innerHTML = '<p>No recent activity</p>';
        }
        
        // Initialize map (you'll need to add a map library like Leaflet or Google Maps)
        initMap();
    }
    
    // Initialize delivery map
    function initMap() {
        const mapContainer = document.getElementById('deliveryMap');
        // This is a placeholder - you'll need to implement actual map functionality
        mapContainer.innerHTML = '<p>Map visualization would go here (requires Leaflet/Google Maps integration)</p>';
    }
    
    // Load deliveries data
    async function loadDeliveries(filterDate = null, filterDriver = null) {
        let query = supabase
            .from('deliveries')
            .select(`
                *,
                users:driver_id (name)
            `)
            .order('date', { ascending: false })
            .order('time', { ascending: false });
        
        if (filterDate) {
            query = query.eq('date', filterDate);
        }
        
        if (filterDriver) {
            query = query.eq('driver_id', filterDriver);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error loading deliveries:', error);
            return;
        }
        
        const tableBody = document.querySelector('#deliveriesTable tbody');
        tableBody.innerHTML = '';
        
        data.forEach(delivery => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${delivery.date}</td>
                <td>${delivery.users.name}</td>
                <td>${delivery.customer_name}</td>
                <td>${delivery.chicken_supplied || 0}</td>
                <td>${delivery.feed_supplied || 0}</td>
                <td>₹${delivery.cash_collected || 0}</td>
                <td>₹${delivery.cash_pending || 0}</td>
                <td>${delivery.payment_method}</td>
                <td>
                    ${delivery.latitude && delivery.longitude ? 
                        `<a href="https://maps.google.com/?q=${delivery.latitude},${delivery.longitude}" target="_blank">View</a>` : 
                        'N/A'}
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    // Load drivers data
    async function loadDrivers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'driver')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading drivers:', error);
            return;
        }
        
        // Populate driver filter in deliveries tab
        const driverFilter = document.getElementById('driverFilter');
        driverFilter.innerHTML = '<option value="">All Drivers</option>';
        
        data.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.id;
            option.textContent = driver.name;
            driverFilter.appendChild(option);
        });
        
        // Populate drivers table
        const tableBody = document.querySelector('#driversTable tbody');
        tableBody.innerHTML = '';
        
        // For each driver, we need to get their recent activity
        for (const driver of data) {
            // Get last delivery
            const { data: lastDelivery } = await supabase
                .from('deliveries')
                .select('created_at')
                .eq('driver_id', driver.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            // Get today's deliveries count
            const today = new Date().toISOString().split('T')[0];
            const { count: todayDeliveries } = await supabase
                .from('deliveries')
                .select('*', { count: 'exact', head: true })
                .eq('driver_id', driver.id)
                .eq('date', today);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${driver.name}</td>
                <td>${driver.email}</td>
                <td>${lastDelivery ? new Date(lastDelivery.created_at).toLocaleString() : 'Never'}</td>
                <td>${todayDeliveries || 0}</td>
                <td>
                    <button class="btn edit-driver" data-id="${driver.id}">Edit</button>
                    <button class="btn delete-driver" data-id="${driver.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        }
        
        // Add event listeners to edit/delete buttons
        document.querySelectorAll('.edit-driver').forEach(btn => {
            btn.addEventListener('click', () => editDriver(btn.getAttribute('data-id')));
        });
        
        document.querySelectorAll('.delete-driver').forEach(btn => {
            btn.addEventListener('click', () => deleteDriver(btn.getAttribute('data-id')));
        });
    }
    
    // Edit driver
    async function editDriver(driverId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', driverId)
            .single();
        
        if (error) {
            console.error('Error loading driver:', error);
            return;
        }
        
        const modal = document.getElementById('driverModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('driverForm');
        
        modalTitle.textContent = 'Edit Driver';
        document.getElementById('driverId').value = data.id;
        document.getElementById('driverNameInput').value = data.name;
        document.getElementById('driverEmailInput').value = data.email;
        document.getElementById('driverPasswordInput').value = ''; // Don't pre-fill password
        
        modal.style.display = 'block';
        
        // Close modal when clicking X
        document.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Delete driver
    async function deleteDriver(driverId) {
        if (confirm('Are you sure you want to delete this driver?')) {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', driverId);
            
            if (error) {
                console.error('Error deleting driver:', error);
                alert('Error deleting driver');
            } else {
                loadDrivers();
            }
        }
    }
    
    // Add new driver
    document.getElementById('addDriverBtn').addEventListener('click', () => {
        const modal = document.getElementById('driverModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('driverForm');
        
        modalTitle.textContent = 'Add New Driver';
        form.reset();
        document.getElementById('driverId').value = '';
        
        modal.style.display = 'block';
    });
    
    // Save driver (add/edit)
    document.getElementById('driverForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const driverId = document.getElementById('driverId').value;
        const name = document.getElementById('driverNameInput').value;
        const email = document.getElementById('driverEmailInput').value;
        const password = document.getElementById('driverPasswordInput').value;
        
        if (driverId) {
            // Update existing driver
            const { data, error } = await supabase
                .from('users')
                .update({
                    name,
                    email,
                    ...(password && { password }) // Only update password if provided
                })
                .eq('id', driverId)
                .select();
            
            if (error) {
                console.error('Error updating driver:', error);
                alert('Error updating driver');
            } else {
                document.getElementById('driverModal').style.display = 'none';
                loadDrivers();
            }
        } else {
            // Create new driver
            // First check if user exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle();
            
            if (existingUser) {
                alert('A user with this email already exists');
                return;
            }
            
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role: 'driver'
                    }
                }
            });
            
            if (authError) {
                console.error('Error creating auth user:', authError);
                alert('Error creating driver account');
                return;
            }
            
            // Add to users table
            const { error } = await supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    email,
                    name,
                    role: 'driver'
                }]);
            
            if (error) {
                console.error('Error adding driver to users table:', error);
                alert('Error completing driver registration');
            } else {
                document.getElementById('driverModal').style.display = 'none';
                loadDrivers();
            }
        }
    });
    
    // Filter deliveries
    document.getElementById('filterBtn').addEventListener('click', () => {
        const date = document.getElementById('deliveryDateFilter').value;
        const driver = document.getElementById('driverFilter').value;
        
        loadDeliveries(date || null, driver || null);
    });
    
    document.getElementById('resetFilterBtn').addEventListener('click', () => {
        document.getElementById('deliveryDateFilter').value = '';
        document.getElementById('driverFilter').value = '';
        loadDeliveries();
    });
    
    // Export to Excel
    document.getElementById('exportExcelBtn').addEventListener('click', async () => {
        // Get all deliveries (you might want to apply current filters)
        const { data } = await supabase
            .from('deliveries')
            .select(`
                *,
                users:driver_id (name)
            `)
            .order('date', { ascending: false })
            .order('time', { ascending: false });
        
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Prepare data for Excel
        const excelData = data.map(delivery => ({
            'Date': delivery.date,
            'Driver': delivery.users.name,
            'Customer': delivery.customer_name,
            'Contact': delivery.customer_contact,
            'Chicken Supplied': delivery.chicken_supplied || 0,
            'Feed Supplied (kg)': delivery.feed_supplied || 0,
            'Cash Collected (₹)': delivery.cash_collected || 0,
            'Cash Pending (₹)': delivery.cash_pending || 0,
            'Payment Method': delivery.payment_method,
            'Location': delivery.latitude && delivery.longitude ? 
                `${delivery.latitude}, ${delivery.longitude}` : 'N/A',
            'Notes': delivery.notes
        }));
        
        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Deliveries');
        
        // Export to file
        XLSX.writeFile(workbook, `KochoosFarm_Deliveries_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
    
    // Export to PDF
    document.getElementById('exportPdfBtn').addEventListener('click', async () => {
        // Get all deliveries (you might want to apply current filters)
        const { data } = await supabase
            .from('deliveries')
            .select(`
                *,
                users:driver_id (name)
            `)
            .order('date', { ascending: false })
            .order('time', { ascending: false });
        
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Kochoos Farm - Deliveries Report', 14, 15);
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
        
        // Prepare data for table
        const tableData = data.map(delivery => [
            delivery.date,
            delivery.users.name,
            delivery.customer_name,
            delivery.chicken_supplied || 0,
            delivery.feed_supplied || 0,
            '₹' + (delivery.cash_collected || 0),
            '₹' + (delivery.cash_pending || 0),
            delivery.payment_method
        ]);
        
        // Add table
        doc.autoTable({
            head: [['Date', 'Driver', 'Customer', 'Chicken', 'Feed (kg)', 'Collected', 'Pending', 'Payment']],
            body: tableData,
            startY: 30,
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            headStyles: {
                fillColor: [40, 167, 69] // Green color
            }
        });
        
        // Save PDF
        doc.save(`KochoosFarm_Deliveries_${new Date().toISOString().split('T')[0]}.pdf`);
    });
    
    // Report type selection
    document.getElementById('reportType').addEventListener('change', function() {
        document.getElementById('reportDateGroup').classList.add('hidden');
        document.getElementById('reportMonthGroup').classList.add('hidden');
        document.getElementById('reportRangeGroup').classList.add('hidden');
        
        if (this.value === 'daily') {
            document.getElementById('reportDateGroup').classList.remove('hidden');
        } else if (this.value === 'monthly') {
            document.getElementById('reportMonthGroup').classList.remove('hidden');
        } else if (this.value === 'custom') {
            document.getElementById('reportRangeGroup').classList.remove('hidden');
        }
    });
    
    // Generate report
    document.getElementById('generateReportBtn').addEventListener('click', async () => {
        const reportType = document.getElementById('reportType').value;
        let startDate, endDate;
        
        if (reportType === 'daily') {
            const date = document.getElementById('reportDate').value;
            if (!date) {
                alert('Please select a date');
                return;
            }
            startDate = date;
            endDate = date;
        } else if (reportType === 'weekly') {
            // Get current week
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust for Sunday
            const monday = new Date(now.setDate(diff));
            startDate = monday.toISOString().split('T')[0];
            
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            endDate = sunday.toISOString().split('T')[0];
        } else if (reportType === 'monthly') {
            const month = document.getElementById('reportMonth').value;
            if (!month) {
                alert('Please select a month');
                return;
            }
            startDate = `${month}-01`;
            
            const year = parseInt(month.split('-')[0]);
            const monthNum = parseInt(month.split('-')[1]);
            const lastDay = new Date(year, monthNum, 0).getDate();
            endDate = `${month}-${lastDay.toString().padStart(2, '0')}`;
        } else if (reportType === 'custom') {
            startDate = document.getElementById('reportStartDate').value;
            endDate = document.getElementById('reportEndDate').value;
            
            if (!startDate || !endDate) {
                alert('Please select both start and end dates');
                return;
            }
        }
        
        // Get deliveries for the period
        const { data } = await supabase
            .from('deliveries')
            .select(`
                *,
                users:driver_id (name)
            `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })
            .order('time', { ascending: true });
        
        if (!data || data.length === 0) {
            document.getElementById('reportSummary').innerHTML = '<p>No data found for the selected period.</p>';
            document.getElementById('reportDetails').innerHTML = '';
            document.getElementById('reportCharts').innerHTML = '';
            return;
        }
        
        // Calculate summary
        const totalChicken = data.reduce((sum, d) => sum + (d.chicken_supplied || 0), 0);
        const totalFeed = data.reduce((sum, d) => sum + (d.feed_supplied || 0), 0);
        const totalCollected = data.reduce((sum, d) => sum + (d.cash_collected || 0), 0);
        const totalPending = data.reduce((sum, d) => sum + (d.cash_pending || 0), 0);
        
        document.getElementById('reportSummary').innerHTML = `
            <div class="report-summary-cards">
                <div class="summary-card">
                    <h4>Total Deliveries</h4>
                    <p>${data.length}</p>
                </div>
                <div class="summary-card">
                    <h4>Chicken Supplied</h4>
                    <p>${totalChicken}</p>
                </div>
                <div class="summary-card">
                    <h4>Feed Supplied (kg)</h4>
                    <p>${totalFeed.toFixed(1)}</p>
                </div>
                <div class="summary-card">
                    <h4>Cash Collected</h4>
                    <p>₹${totalCollected.toFixed(2)}</p>
                </div>
                <div class="summary-card">
                    <h4>Cash Pending</h4>
                    <p>₹${totalPending.toFixed(2)}</p>
                </div>
            </div>
        `;
        
        // Show details table
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Driver</th>
                    <th>Customer</th>
                    <th>Chicken</th>
                    <th>Feed (kg)</th>
                    <th>Collected</th>
                    <th>Pending</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        data.forEach(d => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${d.date}</td>
                <td>${d.users.name}</td>
                <td>${d.customer_name}</td>
                <td>${d.chicken_supplied || 0}</td>
                <td>${d.feed_supplied || 0}</td>
                <td>₹${d.cash_collected || 0}</td>
                <td>₹${d.cash_pending || 0}</td>
            `;
            tbody.appendChild(row);
        });
        
        document.getElementById('reportDetails').innerHTML = '';
        document.getElementById('reportDetails').appendChild(table);
        
        // Show charts
        const chartsContainer = document.getElementById('reportCharts');
        chartsContainer.innerHTML = '<h4>Charts</h4>';
        
        // Chart 1: Daily revenue
        const dailyRevenue = {};
        data.forEach(d => {
            if (!dailyRevenue[d.date]) {
                dailyRevenue[d.date] = 0;
            }
            dailyRevenue[d.date] += d.cash_collected || 0;
        });
        
        const dailyRevenueCanvas = document.createElement('canvas');
        dailyRevenueCanvas.width = '400';
        dailyRevenueCanvas.height = '200';
        chartsContainer.appendChild(dailyRevenueCanvas);
        
        new Chart(dailyRevenueCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(dailyRevenue),
                datasets: [{
                    label: 'Daily Revenue (₹)',
                    data: Object.values(dailyRevenue),
                    backgroundColor: 'rgba(40, 167, 69, 0.5)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Chart 2: Payment methods
        const paymentMethods = {};
        data.forEach(d => {
            const method = d.payment_method || 'unknown';
            if (!paymentMethods[method]) {
                paymentMethods[method] = 0;
            }
            paymentMethods[method] += d.cash_collected || 0;
        });
        
        const paymentMethodsCanvas = document.createElement('canvas');
        paymentMethodsCanvas.width = '400';
        paymentMethodsCanvas.height = '200';
        chartsContainer.appendChild(paymentMethodsCanvas);
        
        new Chart(paymentMethodsCanvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: Object.keys(paymentMethods),
                datasets: [{
                    data: Object.values(paymentMethods),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });
    });
    
    // Export report to Excel
    document.getElementById('exportReportExcelBtn').addEventListener('click', async () => {
        const reportDetails = document.getElementById('reportDetails');
        const table = reportDetails.querySelector('table');
        
        if (!table) {
            alert('Please generate a report first');
            return;
        }
        
        // Get data from table
        const rows = table.querySelectorAll('tbody tr');
        const excelData = [];
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            excelData.push({
                'Date': cells[0].textContent,
                'Driver': cells[1].textContent,
                'Customer': cells[2].textContent,
                'Chicken': cells[3].textContent,
                'Feed (kg)': cells[4].textContent,
                'Collected (₹)': cells[5].textContent.replace('₹', ''),
                'Pending (₹)': cells[6].textContent.replace('₹', '')
            });
        });
        
        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        
        // Export to file
        XLSX.writeFile(workbook, `KochoosFarm_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
    
    // Export report to PDF
    document.getElementById('exportReportPdfBtn').addEventListener('click', async () => {
        const reportDetails = document.getElementById('reportDetails');
        const table = reportDetails.querySelector('table');
        
        if (!table) {
            alert('Please generate a report first');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Kochoos Farm - Detailed Report', 14, 15);
        
        // Add summary
        const summaryCards = document.querySelectorAll('.summary-card');
        let y = 25;
        
        summaryCards.forEach(card => {
            doc.setFontSize(12);
            doc.text(card.querySelector('h4').textContent, 14, y);
            doc.setFontSize(14);
            doc.text(card.querySelector('p').textContent, 14, y + 7);
            y += 15;
        });
        
        // Add table
        doc.autoTable({
            html: table,
            startY: y + 10,
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            headStyles: {
                fillColor: [40, 167, 69] // Green color
            }
        });
        
        // Save PDF
        doc.save(`KochoosFarm_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    });
    
    // Initial load
    loadDashboard();
    loadDrivers();
});

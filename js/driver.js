// supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
document.addEventListener('DOMContentLoaded', async () => {
    // Set current date and time
    const now = new Date();
    document.getElementById('deliveryDate').valueAsDate = now;
    document.getElementById('deliveryTime').value = now.toTimeString().substring(0, 5);
    
    // Update current date and time display
    function updateDateTime() {
        const now = new Date();
        document.getElementById('currentDateTime').textContent = now.toLocaleString();
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Get current location
    document.getElementById('getLocationBtn').addEventListener('click', () => {
        document.getElementById('locationStatus').textContent = 'Getting location...';
        document.getElementById('locationStatus').className = 'message info';
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    document.getElementById('latitude').value = lat;
                    document.getElementById('longitude').value = lng;
                    
                    document.getElementById('locationStatus').textContent = `Location captured: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    document.getElementById('locationStatus').className = 'message success';
                },
                (error) => {
                    document.getElementById('locationStatus').textContent = `Error getting location: ${error.message}`;
                    document.getElementById('locationStatus').className = 'message error';
                }
            );
        } else {
            document.getElementById('locationStatus').textContent = 'Geolocation is not supported by this browser.';
            document.getElementById('locationStatus').className = 'message error';
        }
    });
    
    // Form submission
    document.getElementById('deliveryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const { data: { user } } = await supabase.auth.getUser();
        
        const deliveryData = {
            driver_id: user.id,
            date: document.getElementById('deliveryDate').value,
            time: document.getElementById('deliveryTime').value,
            latitude: document.getElementById('latitude').value,
            longitude: document.getElementById('longitude').value,
            chicken_supplied: parseInt(document.getElementById('chickenSupplied').value) || 0,
            feed_supplied: parseFloat(document.getElementById('feedSupplied').value) || 0,
            cash_collected: parseFloat(document.getElementById('cashCollected').value) || 0,
            cash_pending: parseFloat(document.getElementById('cashPending').value) || 0,
            payment_method: document.getElementById('paymentMethod').value,
            customer_name: document.getElementById('customerName').value,
            customer_contact: document.getElementById('customerContact').value,
            notes: document.getElementById('notes').value
        };
        
        const { data, error } = await supabase
            .from('deliveries')
            .insert([deliveryData])
            .select();
        
        if (error) {
            document.getElementById('deliveryMessage').textContent = `Error saving delivery: ${error.message}`;
            document.getElementById('deliveryMessage').className = 'message error';
        } else {
            document.getElementById('deliveryMessage').textContent = 'Delivery recorded successfully!';
            document.getElementById('deliveryMessage').className = 'message success';
            document.getElementById('deliveryForm').reset();
            // Reset date and time to current
            const now = new Date();
            document.getElementById('deliveryDate').valueAsDate = now;
            document.getElementById('deliveryTime').value = now.toTimeString().substring(0, 5);
            
            // Refresh today's deliveries
            loadTodaysDeliveries();
        }
    });
    
    // Load today's deliveries
    async function loadTodaysDeliveries() {
        const { data: { user } } = await supabase.auth.getUser();
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('deliveries')
            .select('*')
            .eq('driver_id', user.id)
            .eq('date', today)
            .order('time', { ascending: false });
        
        if (error) {
            console.error('Error loading deliveries:', error);
            return;
        }
        
        const deliveriesContainer = document.getElementById('todayDeliveries');
        deliveriesContainer.innerHTML = '';
        
        if (data.length === 0) {
            deliveriesContainer.innerHTML = '<p>No deliveries recorded today.</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Customer</th>
                    <th>Chicken</th>
                    <th>Feed</th>
                    <th>Collected</th>
                    <th>Pending</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        data.forEach(delivery => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${delivery.time.substring(0, 5)}</td>
                <td>${delivery.customer_name}</td>
                <td>${delivery.chicken_supplied || 0}</td>
                <td>${delivery.feed_supplied || 0} kg</td>
                <td>₹${delivery.cash_collected || 0}</td>
                <td>₹${delivery.cash_pending || 0}</td>
            `;
            tbody.appendChild(row);
        });
        
        deliveriesContainer.appendChild(table);
    }
    
    // Initial load
    loadTodaysDeliveries();
});

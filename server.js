const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Supabase configuration
const supabaseUrl = 'https://xseoauyhebklccbhiawp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZW9hdXloZWJrbGNjYmhpYXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NjkwNjAsImV4cCI6MjA1NTA0NTA2MH0.G-0vB7u33qIozLu2Fc1h3g0P2X2Q69W0PTtc8hHLv00';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    try {
        const {
            username,
            first_name,
            last_name,
            gender,
            date_of_birth,
            car_number,
            aadhar_number,
            password
        } = req.body;

        // First, check if username already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Insert new user
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    first_name,
                    last_name,
                    gender,
                    date_of_birth,
                    car_number,
                    aadhar_number,
                    password // Note: In production, always hash passwords
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Signup error:', error);
            return res.status(400).json({ 
                error: error.message || 'Error creating account' 
            });
        }

        // Return success response
        res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: data.id,
                username: data.username,
                first_name: data.first_name,
                last_name: data.last_name
            }
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error' 
        });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !user) {
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }

        const token = 'dummy_token_' + Math.random();

        res.json({
            message: 'Login successful',
            jwt_token: token,
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                gender: user.gender,
                date_of_birth: user.date_of_birth,
                car_number: user.car_number,
                aadhar_number: user.aadhar_number,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Internal server error' 
        });
    }
});

// Add this new endpoint after your existing endpoints
app.get('/api/user-details', async (req, res) => {
    try {
        // Get the authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Get user ID from localStorage (you should use proper token verification in production)
        const userId = req.query.userId;

        // Fetch user details from Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user details:', error);
            return res.status(400).json({ error: 'Error fetching user details' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return user details (excluding sensitive information)
        res.json({
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            gender: user.gender,
            date_of_birth: user.date_of_birth,
            car_number: user.car_number,
            aadhar_number: user.aadhar_number,
            created_at: user.created_at
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all states from parking_locations
app.get('/api/states', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('parking_locations')
            .select('state')
            .order('state');

        if (error) throw error;

        // Get unique states using Set
        const uniqueStates = [...new Set(data.map(item => item.state))];
        res.json(uniqueStates);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get districts for selected state
app.get('/api/districts/:state', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('parking_locations')
            .select('district')
            .eq('state', req.params.state)
            .order('district');

        if (error) throw error;

        // Get unique districts using Set
        const uniqueDistricts = [...new Set(data.map(item => item.district))];
        res.json(uniqueDistricts);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get areas for selected state and district
app.get('/api/areas/:state/:district', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('parking_locations')
            .select('area')
            .eq('state', req.params.state)
            .eq('district', req.params.district)
            .order('area');

        if (error) throw error;

        // Get unique areas using Set
        const uniqueAreas = [...new Set(data.map(item => item.area))];
        res.json(uniqueAreas);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get parking lots by state, district, and area
app.get('/api/parking-lots/:state/:district/:area', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('parking_locations')
            .select('*')
            .eq('state', req.params.state)
            .eq('district', req.params.district)
            .eq('area', req.params.area)
            .eq('is_active', true)
            .order('parking_lot_name');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Book slot endpoint
app.post('/api/book-slot', async (req, res) => {
    try {
        const {
            parking_lot_id,
            driver_name,
            car_number,
            aadhar_number,
            date,
            actual_arrival_time,
            actual_departed_time,
            user_id
        } = req.body;

        // First check if parking lot exists and has available slots
        const { data: parkingLot, error: parkingError } = await supabase
            .from('parking_locations')
            .select('available_slots, total_slots, opening_time, closing_time')
            .eq('location_id', parking_lot_id)
            .single();

        if (parkingError) throw parkingError;

        // Check for overlapping bookings
        const { data: existingBookings, error: bookingsError } = await supabase
            .from('slot_booking')
            .select('slot_number')
            .eq('parking_lot_location', parking_lot_id)
            .eq('booked_date', date)
            .neq('booking_status', 'CANCELLED')
            .or(
                `and(actual_arrival_time.lte.${actual_departed_time},actual_departed_time.gte.${actual_arrival_time})`
            );

        if (bookingsError) throw bookingsError;

        // If all slots are booked for this time period
        if (existingBookings && existingBookings.length >= parkingLot.total_slots) {
            return res.status(400).json({ 
                error: 'No slots available for the selected time period' 
            });
        }

        // Find available slot number
        const bookedSlots = existingBookings ? existingBookings.map(booking => booking.slot_number) : [];
        let availableSlot = 1;
        while (bookedSlots.includes(availableSlot) && availableSlot <= parkingLot.total_slots) {
            availableSlot++;
        }

        // Create booking
        const { data: booking, error: bookingError } = await supabase
            .from('slot_booking')
            .insert([{
                user_id,
                user_name: driver_name,
                car_number,
                aadhar_number,
                driver_name,
                driver_aadhar: aadhar_number,
                actual_arrival_time,
                actual_departed_time,
                booked_date: date,
                slot_number: availableSlot,
                parking_lot_location: parking_lot_id,
                booking_status: 'PENDING'
            }])
            .select()
            .single();

        if (bookingError) throw bookingError;

        // Update available slots
        const { error: updateError } = await supabase
            .from('parking_locations')
            .update({ 
                available_slots: parkingLot.available_slots - 1 
            })
            .eq('location_id', parking_lot_id);

        if (updateError) throw updateError;

        res.json({ 
            message: 'Booking successful', 
            booking_id: booking.booking_id,
            slot_number: availableSlot,
            available_slots: parkingLot.available_slots - 1
        });

    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update the booking history endpoint
app.get('/api/booking-history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Fetching bookings for user:', userId);

        // First get the bookings
        const { data: bookings, error: bookingsError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('user_id', userId);

        if (bookingsError) throw bookingsError;

        // If we have bookings, fetch the parking location details for each
        if (bookings && bookings.length > 0) {
            const bookingsWithLocations = await Promise.all(
                bookings.map(async (booking) => {
                    const { data: locationData } = await supabase
                        .from('parking_locations')
                        .select('*')
                        .eq('location_id', booking.parking_lot_location)
                        .single();
                    
                    return {
                        ...booking,
                        parking_locations: locationData || null
                    };
                })
            );

            console.log('Bookings with locations:', bookingsWithLocations);
            res.json(bookingsWithLocations);
        } else {
            console.log('No bookings found');
            res.json([]);
        }

    } catch (error) {
        console.error('Error fetching booking history:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update the check slot availability endpoint
app.post('/api/check-slot-availability', async (req, res) => {
    try {
        const { parking_lot_id, date, arrival_time, departure_time } = req.body;
        
        // Log the request
        console.log('Checking availability for:', { parking_lot_id, date, arrival_time, departure_time });

        // Validate input
        if (!parking_lot_id || !date || !arrival_time || !departure_time) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                available: false,
                availableSlots: 0
            });
        }

        // Get parking lot details
        const { data: parkingLot, error: parkingLotError } = await supabase
            .from('parking_locations')
            .select('total_slots')
            .eq('location_id', parking_lot_id)
            .single();

        if (parkingLotError) {
            console.error('Parking lot error:', parkingLotError);
            return res.status(500).json({ 
                error: 'Failed to fetch parking lot details',
                available: false,
                availableSlots: 0
            });
        }

        // Get existing bookings
        const { data: existingBookings, error: bookingsError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('parking_lot_location', parking_lot_id)
            .eq('booked_date', date)
            .neq('booking_status', 'CANCELLED');

        if (bookingsError) {
            console.error('Bookings error:', bookingsError);
            return res.status(500).json({ 
                error: 'Failed to fetch existing bookings',
                available: false,
                availableSlots: 0
            });
        }

        // Calculate available slots
        const totalSlots = parkingLot.total_slots;
        const overlappingBookings = existingBookings.filter(booking => {
            return (
                (arrival_time < booking.actual_departed_time) &&
                (departure_time > booking.actual_arrival_time)
            );
        });

        const availableSlots = totalSlots - overlappingBookings.length;

        // Log the result
        console.log('Availability check result:', {
            totalSlots,
            bookedSlots: overlappingBookings.length,
            availableSlots
        });

        return res.json({
            available: availableSlots > 0,
            availableSlots,
            totalSlots
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            available: false,
            availableSlots: 0
        });
    }
});

// Extend booking endpoint
app.post('/api/extend-booking', async (req, res) => {
    try {
        const { booking_id, new_end_time } = req.body;

        // Validate input
        if (!booking_id || !new_end_time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // First get the current booking details
        const { data: currentBooking, error: bookingError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('booking_id', booking_id)
            .single();

        if (bookingError) {
            console.error('Error fetching current booking:', bookingError);
            return res.status(500).json({ error: 'Failed to fetch booking details' });
        }

        // Check for overlapping bookings
        const { data: existingBookings, error: bookingsError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('parking_lot_location', currentBooking.parking_lot_location)
            .eq('booked_date', currentBooking.booked_date)
            .eq('slot_number', currentBooking.slot_number)
            .neq('booking_id', booking_id)  // Exclude current booking
            .neq('booking_status', 'CANCELLED');

        if (bookingsError) {
            console.error('Error checking overlapping bookings:', bookingsError);
            return res.status(500).json({ error: 'Failed to check availability' });
        }

        // Check for time conflicts
        const hasConflict = existingBookings.some(booking => 
            new_end_time > booking.actual_arrival_time && 
            currentBooking.actual_arrival_time < booking.actual_departed_time
        );

        if (hasConflict) {
            return res.status(400).json({ 
                error: 'Cannot extend booking. Time slot is already booked.' 
            });
        }

        // Update the booking
        const { data: updatedBooking, error: updateError } = await supabase
            .from('slot_booking')
            .update({ 
                actual_departed_time: new_end_time,
                updated_at: new Date().toISOString()
            })
            .eq('booking_id', booking_id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating booking:', updateError);
            return res.status(500).json({ error: 'Failed to extend booking' });
        }

        res.json({ 
            message: 'Booking extended successfully',
            booking: updatedBooking
        });

    } catch (error) {
        console.error('Error in extend-booking endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

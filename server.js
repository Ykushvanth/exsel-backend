const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();

// Supabase configuration
const supabaseUrl = 'https://xseoauyhebklccbhiawp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZW9hdXloZWJrbGNjYmhpYXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NjkwNjAsImV4cCI6MjA1NTA0NTA2MH0.G-0vB7u33qIozLu2Fc1h3g0P2X2Q69W0PTtc8hHLv00';
const supabase = createClient(supabaseUrl, supabaseKey);

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'Slotify722@gmail.com',  // Your Gmail
        pass: 'axvsdlcdogwflibg'          // Your Gmail app password
    }
});

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
            phone_number,
            email,
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
                    phone_number,
                    email,
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

// Update the user details endpoint
app.get('/api/user-details', async (req, res) => {
    try {
        // Get the authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Get user ID from localStorage
        const userId = req.query.userId;

        // Fetch user details from Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                id,
                username,
                first_name,
                last_name,
                gender,
                date_of_birth,
                car_number,
                aadhar_number,
                phone_number,
                email,
                created_at
            `)
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
            phone_number: user.phone_number,
            email: user.email,
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

// Get parking lots by state, district, and area with enhanced features
app.get('/api/parking-lots/:state/:district/:area', async (req, res) => {
    try {
        console.log('Received request for:', req.params);

        // First get the parking lots with only existing columns
        const { data: parkingLots, error } = await supabase
            .from('parking_locations')
            .select(`
                location_id,
                parking_lot_name,
                address,
                total_slots,
                price_per_hour,
                opening_time,
                closing_time,
                url,
                state,
                district,
                area,
                latitude,
                longitude
            `)
            .eq('state', req.params.state)
            .eq('district', req.params.district)
            .eq('area', req.params.area);

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Retrieved parking lots:', parkingLots);

        // Process each parking lot
        const processedParkingLots = parkingLots.map(lot => ({
            id: lot.location_id,
            name: lot.parking_lot_name,
            address: lot.address,
            total_slots: lot.total_slots,
            price_per_hour: lot.price_per_hour,
            opening_time: lot.opening_time,
            closing_time: lot.closing_time,
            url: lot.url,
            latitude: lot.latitude,
            longitude: lot.longitude
        }));

        // Debug logs
        console.log('Processed parking lots:', processedParkingLots);
        console.log('First parking lot URL:', processedParkingLots[0]?.url);
        console.log('First parking lot full details:', processedParkingLots[0]);
        console.log('First parking lot coordinates:', {
            lat: parkingLots[0]?.latitude,
            lng: parkingLots[0]?.longitude
        });

        res.json({
            success: true,
            count: processedParkingLots.length,
            parking_lots: processedParkingLots
        });

    } catch (error) {
        console.error('Error fetching parking lots:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch parking lots',
            message: error.message 
        });
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

        // Get parking lot details
        const { data: parkingLot, error: parkingError } = await supabase
            .from('parking_locations')
            .select('available_slots, total_slots, opening_time, closing_time, url, price_per_hour')
            .eq('location_id', parking_lot_id)
            .single();

        if (parkingError) {
            console.error('Error fetching parking lot:', parkingError);
            throw parkingError;
        }

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

        // Create booking with location URL
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
                location: parkingLot.url,
                booking_status: 'PENDING'
            }])
            .select()
            .single();

        if (bookingError) {
            console.error('Error creating booking:', bookingError);
            throw bookingError;
        }

        // Update available slots
        const { error: updateError } = await supabase
            .from('parking_locations')
            .update({ 
                available_slots: parkingLot.available_slots - 1 
            })
            .eq('location_id', parking_lot_id);

        if (updateError) throw updateError;

        // After successful booking, get user email
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email, first_name')
            .eq('id', user_id)
            .single();

        if (userError) throw userError;

        // Prepare and send email
        const emailContent = {
            from: 'parksmart.help@gmail.com',
            to: userData.email,
            subject: 'ParkSmart - Booking Confirmation',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #0A514E; margin: 0;">ParkSmart</h1>
                        <p style="color: #666;">Your Parking Booking Confirmation</p>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin-top: 0;">Dear ${userData.first_name},</p>
                        <p>Your parking slot has been successfully booked! Here are your booking details:</p>
                        
                        <div style="margin: 20px 0; padding: 15px; background-color: white; border-radius: 8px;">
                            <p style="margin: 8px 0;"><strong>Booking ID:</strong> ${booking.booking_id}</p>
                            <p style="margin: 8px 0;"><strong>Car Number:</strong> ${car_number}</p>
                            <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
                            <p style="margin: 8px 0;"><strong>Arrival Time:</strong> ${actual_arrival_time}</p>
                            <p style="margin: 8px 0;"><strong>Departure Time:</strong> ${actual_departed_time}</p>
                            <p style="margin: 8px 0;"><strong>Slot Number:</strong> ${booking.slot_number}</p>
                        </div>

                        ${booking.location ? `
                            <div style="text-align: center; margin-top: 20px;">
                                <a href="${booking.location}" 
                                   style="background-color: #0A514E; color: white; padding: 10px 20px; 
                                          text-decoration: none; border-radius: 5px; display: inline-block;"
                                   target="_blank">
                                    View Location in Maps
                                </a>
                            </div>
                        ` : ''}
                    </div>

                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px; margin: 0;">
                            Thank you for choosing ParkSmart! If you need to modify your booking or have any questions, 
                            please visit our website or contact our support team.
                        </p>
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(emailContent);
            console.log('Confirmation email sent successfully');
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            // Don't throw error here - we don't want to fail the booking if email fails
        }

        // Continue with your existing response
        res.json({ 
            message: 'Booking successful', 
            booking_id: booking.booking_id,
            slot_number: booking.slot_number,
            available_slots: parkingLot.available_slots - 1,
            location: booking.location
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

// Add update user endpoint
app.put('/api/update-user', async (req, res) => {
    try {
        const { userId, phone_number, email } = req.body;

        // Validate input
        if (!userId || !phone_number || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Update user details
        const { data, error } = await supabase
            .from('users')
            .update({ 
                phone_number,
                email,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Update error:', error);
            return res.status(400).json({ error: 'Failed to update user details' });
        }

        res.json({
            message: 'User details updated successfully',
            user: data
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

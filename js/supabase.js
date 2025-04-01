// Initialize Supabase
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://txiukritnbhyazeopisa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aXVrcml0bmJoeWF6ZW9waXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzOTIzNjMsImV4cCI6MjA1ODk2ODM2M30.ssAJqsaHPGd03qHPZFok_Toa-WrhpHffW5-vCOWveTk';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

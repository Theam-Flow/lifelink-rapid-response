# 🔌 API Documentation

Complete API reference for LifeLink backend.

## Table of Contents

1. [Authentication](#authentication)
2. [REST API](#rest-api)
3. [Real-time Subscriptions](#real-time-subscriptions)
4. [Edge Functions](#edge-functions)
5. [Storage API](#storage-api)
6. [Geospatial Queries](#geospatial-queries)

## Authentication

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      full_name: 'John Doe',
      role: 'victim'
    }
  }
});
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut();
```

### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### Session Management

```typescript
// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user);
  }
  if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  }
});

// Get current session
const { data: { session } } = await supabase.auth.getSession();
```

## REST API

All API requests go through Supabase's auto-generated REST API.

### Base URL

```
https://yourproject.supabase.co/rest/v1
```

### Headers

```typescript
{
  'apikey': 'your_anon_key',
  'Authorization': 'Bearer your_jwt_token',
  'Content-Type': 'application/json'
}
```

### Profiles

#### Get User Profile

```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

#### Update Profile

```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: 'Updated Name',
    phone: '+66123456789',
    status: 'safe'
  })
  .eq('id', userId);
```

#### Get Nearby Rescuers

```typescript
const { data, error } = await supabase
  .rpc('get_nearby_rescuers', {
    user_lat: 13.7563,
    user_lng: 100.5018,
    radius_km: 10
  });
```

### SOS Signals

#### Create SOS Signal

```typescript
const { data, error } = await supabase
  .from('sos_signals')
  .insert({
    user_id: userId,
    location: `POINT(${lng} ${lat})`,
    type: 'flood_trap',
    severity_level: 4,
    victim_count: 3,
    description: 'Trapped on roof, water rising fast',
    contact_phone: '+66123456789',
    accuracy_meters: 10
  })
  .select()
  .single();
```

#### Get All Active SOS Signals

```typescript
const { data, error } = await supabase
  .from('sos_signals')
  .select(`
    *,
    profiles (
      full_name,
      phone,
      avatar_url
    )
  `)
  .in('status', ['active', 'acknowledged', 'in_progress'])
  .order('created_at', { ascending: false });
```

#### Get Nearby SOS Signals

```typescript
const { data, error } = await supabase
  .rpc('get_sos_nearby', {
    user_lat: 13.7563,
    user_lng: 100.5018,
    radius_km: 50,
    page_size: 20,
    page_offset: 0
  });
```

#### Update SOS Status

```typescript
const { data, error } = await supabase
  .from('sos_signals')
  .update({
    status: 'in_progress',
    assigned_rescuer_id: rescuerId,
    in_progress_at: new Date().toISOString()
  })
  .eq('id', sosId);
```

#### Get Clustered SOS (for Map)

```typescript
const { data, error } = await supabase
  .rpc('get_clustered_sos', {
    min_lat: 13.5,
    min_lng: 100.3,
    max_lat: 14.0,
    max_lng: 100.7,
    cluster_distance: 100 // meters
  });
```

### Messages

#### Send Message

```typescript
const { data, error } = await supabase
  .from('messages')
  .insert({
    user_id: userId,
    sos_id: sosId,
    content: 'Help is on the way!',
    type: 'text'
  })
  .select()
  .single();
```

#### Get Messages for SOS

```typescript
const { data, error } = await supabase
  .from('messages')
  .select(`
    *,
    profiles (
      full_name,
      avatar_url,
      role
    )
  `)
  .eq('sos_id', sosId)
  .order('created_at', { ascending: true });
```

### Shelters

#### Get All Shelters

```typescript
const { data, error } = await supabase
  .from('shelters')
  .select('*')
  .eq('is_verified', true)
  .order('name');
```

#### Get Nearby Shelters

```typescript
const { data, error } = await supabase
  .rpc('get_nearby_shelters', {
    user_lat: 13.7563,
    user_lng: 100.5018,
    radius_km: 20
  });
```

#### Create Shelter

```typescript
const { data, error } = await supabase
  .from('shelters')
  .insert({
    name: 'Wat Pho Temple',
    type: 'temple',
    location: `POINT(${lng} ${lat})`,
    address: '2 Sanam Chai Rd, Bangkok',
    contact_phone: '+66212345678',
    capacity_max: 500,
    manager_id: userId
  })
  .select()
  .single();
```

#### Update Shelter Capacity

```typescript
const { data, error } = await supabase
  .from('shelters')
  .update({
    capacity_current: 250,
    supplies_status: {
      water: { available: true, quantity: 500, unit: 'liters' },
      food: { available: true, quantity: 200, unit: 'meals' }
    }
  })
  .eq('id', shelterId);
```

### Missing Persons

#### Report Missing Person

```typescript
const { data, error } = await supabase
  .from('missing_persons')
  .insert({
    reporter_id: userId,
    full_name: 'Somchai Patel',
    age: 45,
    gender: 'male',
    height_cm: 170,
    city: 'Bangkok',
    last_seen_at: '2025-01-20T10:00:00Z',
    last_seen_location: `POINT(${lng} ${lat})`,
    photo_urls: ['https://...'],
    description: 'Last seen wearing blue shirt',
    contact_phone: '+66123456789'
  })
  .select()
  .single();
```

#### Search Missing Persons

```typescript
const { data, error } = await supabase
  .from('missing_persons')
  .select('*')
  .eq('status', 'missing')
  .ilike('full_name', '%somchai%')
  .order('created_at', { ascending: false });
```

#### Update Missing Person Status

```typescript
const { data, error } = await supabase
  .from('missing_persons')
  .update({
    status: 'safe',
    found_at: new Date().toISOString(),
    found_location: `POINT(${lng} ${lat})`
  })
  .eq('id', personId);
```

### Resources

#### Register Resource

```typescript
const { data, error } = await supabase
  .from('resources')
  .insert({
    owner_id: userId,
    name: 'Red Rescue Boat #5',
    type: 'boat_large',
    current_location: `POINT(${lng} ${lat})`,
    capacity: 20,
    license_plate: 'ABC-1234',
    contact_info: '+66123456789',
    status: 'available',
    available_now: true
  })
  .select()
  .single();
```

#### Get Available Resources

```typescript
const { data, error } = await supabase
  .from('resources')
  .select('*')
  .eq('available_now', true)
  .eq('status', 'available')
  .order('created_at', { ascending: false });
```

### Rescuer Activity

#### Update Rescuer Location

```typescript
const { data, error } = await supabase
  .from('rescuer_activity')
  .upsert({
    rescuer_id: userId,
    location: `POINT(${lng} ${lat})`,
    status: 'busy',
    current_sos_id: sosId,
    heading: 45,
    speed_kmh: 30,
    last_ping: new Date().toISOString()
  });
```

#### Get Active Rescuers

```typescript
const { data, error } = await supabase
  .from('rescuer_activity')
  .select(`
    *,
    profiles (
      full_name,
      phone,
      avatar_url
    )
  `)
  .gte('last_ping', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 mins
  .eq('status', 'available');
```

## Real-time Subscriptions

### Subscribe to SOS Updates

```typescript
const channel = supabase
  .channel('sos_updates')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'sos_signals'
    },
    (payload) => {
      console.log('SOS update:', payload);
      if (payload.eventType === 'INSERT') {
        // New SOS signal created
        handleNewSOS(payload.new);
      }
      if (payload.eventType === 'UPDATE') {
        // SOS signal updated
        handleSOSUpdate(payload.new);
      }
    }
  )
  .subscribe();

// Unsubscribe when done
channel.unsubscribe();
```

### Subscribe to Messages

```typescript
const channel = supabase
  .channel(`messages_${sosId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `sos_id=eq.${sosId}`
    },
    (payload) => {
      console.log('New message:', payload.new);
      addMessageToChat(payload.new);
    }
  )
  .subscribe();
```

### Subscribe to Rescuer Locations

```typescript
const channel = supabase
  .channel('rescuer_tracking')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'rescuer_activity'
    },
    (payload) => {
      console.log('Rescuer location update:', payload.new);
      updateRescuerMarker(payload.new);
    }
  )
  .subscribe();
```

### Presence (Online Users)

```typescript
const channel = supabase.channel('online_users');

// Track your presence
channel
  .on('presence', { event: 'sync' }, () => {
    const presenceState = channel.presenceState();
    console.log('Online users:', Object.keys(presenceState).length);
  })
  .on('presence', { event: 'join' }, ({ newPresences }) => {
    console.log('User joined:', newPresences);
  })
  .on('presence', { event: 'leave' }, ({ leftPresences }) => {
    console.log('User left:', leftPresences);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString()
      });
    }
  });
```

## Edge Functions

Edge Functions run on Deno runtime at the edge for low latency.

### Deploy Edge Function

```bash
# Create function
supabase functions new my-function

# Deploy
supabase functions deploy my-function
```

### Example: Send Notification

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { sos_id, message } = await req.json();
    
    // Get nearby rescuers
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: rescuers } = await supabase
      .rpc('get_nearby_rescuers', {
        sos_id: sos_id,
        radius_km: 50
      });
    
    // Send push notifications
    for (const rescuer of rescuers || []) {
      await sendPushNotification(rescuer, message);
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

### Call Edge Function

```typescript
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    sos_id: 'uuid-here',
    message: 'New emergency alert nearby!'
  }
});
```

## Storage API

### Upload File

```typescript
const file = event.target.files[0];
const fileExt = file.name.split('.').pop();
const filePath = `${userId}/avatar.${fileExt}`;

const { data, error } = await supabase.storage
  .from('avatars')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: true
  });
```

### Get Public URL

```typescript
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(filePath);

console.log(data.publicUrl);
```

### Download File

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .download(filePath);

// Convert to URL
const url = URL.createObjectURL(data);
```

### Delete File

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .remove([filePath]);
```

## Geospatial Queries

### Distance Calculation

```typescript
// Calculate distance between two points
const { data, error } = await supabase.rpc('calculate_distance', {
  lat1: 13.7563,
  lng1: 100.5018,
  lat2: 13.7563,
  lng2: 100.6018
});

console.log(`Distance: ${data} meters`);
```

### Points Within Radius

```typescript
// Find all points within radius
const { data, error } = await supabase.rpc('points_within_radius', {
  center_lat: 13.7563,
  center_lng: 100.5018,
  radius_meters: 5000,
  table_name: 'sos_signals'
});
```

### Nearest Neighbors

```typescript
// Find N nearest points
const { data, error } = await supabase.rpc('find_nearest', {
  to_lat: 13.7563,
  to_lng: 100.5018,
  limit_count: 10,
  table_name: 'shelters'
});
```

## Rate Limiting

Supabase has built-in rate limiting:

- **Anonymous requests**: 200 requests per minute
- **Authenticated requests**: 1000 requests per minute
- **Storage uploads**: 100 requests per minute

## Error Handling

```typescript
const { data, error } = await supabase
  .from('sos_signals')
  .select('*');

if (error) {
  switch (error.code) {
    case 'PGRST301':
      console.error('Row not found');
      break;
    case '23505':
      console.error('Duplicate key violation');
      break;
    case '42501':
      console.error('Permission denied (RLS)');
      break;
    default:
      console.error('Unknown error:', error.message);
  }
}
```

## Best Practices

1. **Always handle errors** - Never assume queries will succeed
2. **Use RLS policies** - Never bypass Row Level Security
3. **Paginate large results** - Use `range()` for pagination
4. **Index frequently queried columns** - Improve query performance
5. **Use select() wisely** - Only fetch columns you need
6. **Cache when possible** - Use React Query or similar
7. **Clean up subscriptions** - Always unsubscribe when done
8. **Use prepared statements** - For repeated queries
9. **Monitor usage** - Check Supabase dashboard regularly
10. **Secure your keys** - Never expose service role key in client

## API Limits

### Free Tier
- 500 MB database
- 1 GB storage
- 2 GB bandwidth
- 500,000 edge function invocations

### Pro Tier ($25/month)
- 8 GB database
- 100 GB storage
- 250 GB bandwidth
- Unlimited edge function invocations

## Testing

```typescript
import { createClient } from '@supabase/supabase-js';

// Test client
const supabase = createClient(
  'http://localhost:54321',
  'test-anon-key'
);

// Run tests
describe('SOS Signals API', () => {
  it('creates SOS signal', async () => {
    const { data, error } = await supabase
      .from('sos_signals')
      .insert({ /* ... */ });
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

## Webhook Events

Configure webhooks in Supabase Dashboard → Database → Webhooks

```typescript
// Webhook payload structure
{
  "type": "INSERT",
  "table": "sos_signals",
  "record": {
    "id": "uuid",
    "user_id": "uuid",
    "location": "POINT(...)",
    // ... other fields
  },
  "schema": "public",
  "old_record": null
}
```

---

**API Version**: 1.0  
**Last Updated**: January 2025  
**Maintainer**: @withkevinm

For API support: api@lifelinkasia.org

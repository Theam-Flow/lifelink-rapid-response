import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClusterRequest {
  bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  zoom: number;
}

// Calcula la distancia de clustering según el zoom
function getClusterDistance(zoom: number): number {
  // Más zoom = menor distancia de clustering
  if (zoom >= 15) return 0.001; // ~100m
  if (zoom >= 13) return 0.005; // ~500m
  if (zoom >= 11) return 0.01;  // ~1km
  if (zoom >= 9) return 0.05;   // ~5km
  return 0.1; // ~10km
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { bounds, zoom }: ClusterRequest = await req.json();

    if (!bounds || typeof zoom !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Missing bounds or zoom parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clusterDistance = getClusterDistance(zoom);

    console.log(`Clustering SOS signals at zoom ${zoom} with distance ${clusterDistance}`);

    // Llamar a la función de clustering en PostgreSQL
    const { data, error } = await supabase.rpc('get_clustered_sos', {
      min_lng: bounds.west,
      min_lat: bounds.south,
      max_lng: bounds.east,
      max_lat: bounds.north,
      cluster_distance: clusterDistance
    });

    if (error) {
      console.error('Error fetching clusters:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Returned ${data?.length || 0} clusters`);

    return new Response(
      JSON.stringify({ clusters: data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

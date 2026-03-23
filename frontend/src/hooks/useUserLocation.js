import { useState, useEffect } from 'react';

export default function useUserLocation() {
  const [location, setLocation] = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ lat: 23.0225, lng: 72.5714 });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        setLocation({ lat: 23.0225, lng: 72.5714 });
        setLoading(false);
        setError('Could not get location — showing default area');
      }
    );
  }, []);

  return { location, error, loading };
}

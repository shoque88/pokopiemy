'use client';

import { useEffect, useRef, useState } from 'react';

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export default function PlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Wpisz adres...',
  required = false,
  id = 'location-input',
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Sprawdź czy Google Maps API jest już załadowane
    if (window.google && window.google.maps && window.google.maps.places) {
      initializeAutocomplete();
      return;
    }

    // Jeśli nie, załaduj skrypt
    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      
      if (!apiKey) {
        console.warn('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nie jest ustawiony. Wyszukiwanie adresów nie będzie działać.');
        return;
      }

      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=pl`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeAutocomplete();
      };
      document.head.appendChild(script);
    } else {
      // Skrypt już istnieje, poczekaj na załadowanie
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkGoogle);
          initializeAutocomplete();
        }
      }, 100);
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
      }
    };
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      componentRestrictions: { country: 'pl' }, // Ograniczenie do Polski
      fields: ['formatted_address', 'geometry', 'name'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        onChange(place.formatted_address);
      }
    });

    autocompleteRef.current = autocomplete;
    setIsLoaded(true);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="form-control"
      style={{ width: '100%' }}
    />
  );
}


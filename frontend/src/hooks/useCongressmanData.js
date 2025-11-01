import { useState, useEffect } from 'react';
import { getCongressman } from '../utils/api';

export const useCongressmanData = (id) => {
  const [congressman, setCongressman] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCongressman(id);
        setCongressman(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch congressman data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  return { congressman, loading, error };
};


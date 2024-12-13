import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Save, Plus, X, Github, Loader2 } from 'lucide-react';

const GIST_FILENAME = 'daily-logs.json';

const DailyLog = () => {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('morning');
  const [newActivity, setNewActivity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState('');
  const [gistId, setGistId] = useState('');
  
  const defaultSchedule = [
    { name: 'Morning review', time: '10:00', completed: false },
    { name: 'Exercise', time: '', completed: false },
    { name: 'Lunch break', time: '', completed: false },
    { name: 'Deep work session 1', time: '', completed: false },
    { name: 'Deep work session 2', time: '', completed: false },
    { name: 'Evening review', time: '17:00', completed: false }
  ];

  const [logData, setLogData] = useState({
    morning: {
      objectives: ['', '', ''],
      schedule: defaultSchedule,
      notes: ''
    },
    evening: {
      accomplished: '',
      notes: '',
      tomorrow: ''
    }
  });

  // Load GitHub token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    const savedGistId = localStorage.getItem('gist_id');
    if (savedToken) {
      setToken(savedToken);
      setGistId(savedGistId);
    }
  }, []);

  // Load data for current date
  useEffect(() => {
    if (token && gistId) {
      loadDataFromGist();
    }
  }, [currentDate, token, gistId]);

  const handleGithubAuth = async () => {
    const newToken = prompt('Please enter your GitHub personal access token:');
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('github_token', newToken);
      
      // Create or get existing gist
      try {
        setIsLoading(true);
        const existingGistId = await findExistingGist(newToken);
        
        if (existingGistId) {
          setGistId(existingGistId);
          localStorage.setItem('gist_id', existingGistId);
        } else {
          const newGistId = await createInitialGist(newToken);
          setGistId(newGistId);
          localStorage.setItem('gist_id', newGistId);
        }
      } catch (error) {
        console.error('Error setting up Gist:', error);
        alert('Failed to set up GitHub storage. Please check your token and try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const findExistingGist = async (authToken) => {
    const response = await fetch('https://api.github.com/gists', {
      headers: {
        'Authorization': `token ${authToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch gists');
    
    const gists = await response.json();
    const dailyLogGist = gists.find(gist => 
      gist.files[GIST_FILENAME] && 
      gist.description === 'Daily Log Storage'
    );
    
    return dailyLogGist ? dailyLogGist.id : null;
  };

  const createInitialGist = async (authToken) => {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${authToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        description: 'Daily Log Storage',
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify({})
          }
        }
      })
    });
    
    if (!response.ok) throw new Error('Failed to create gist');
    
    const data = await response.json();
    return data.id;
  };

  const loadDataFromGist = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch gist');
      
      const data = await response.json();
      const content = JSON.parse(data.files[GIST_FILENAME].content);
      
      if (content[currentDate]) {
        setLogData(content[currentDate]);
      } else {
        // Reset to default state for new dates
        setLogData({
          morning: {
            objectives: ['', '', ''],
            schedule: defaultSchedule,
            notes: ''
          },
          evening: {
            accomplished: '',
            notes: '',
            tomorrow: ''
          }
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data from GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token || !gistId) {
      alert('Please set up GitHub storage first');
      return;
    }

    try {
      setIsLoading(true);
      
      // First get the current content
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch current gist');
      
      const data = await response.json();
      const content = JSON.parse(data.files[GIST_FILENAME].content);
      
      // Update with new data
      content[currentDate] = logData;
      
      // Save back to GitHub
      const updateResponse = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(content)
            }
          }
        })
      });
      
      if (!updateResponse.ok) throw new Error('Failed to update gist');
      
      alert('Saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data to GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  // ... (rest of the component code remains the same, including UI rendering)
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      {!token && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <button
            onClick={handleGithubAuth}
            className="flex items-center justify-center w-full p-3 bg-gray-900 text-white rounded-lg"
            disabled={isLoading}
          >
            <Github className="mr-2" />
            Set Up GitHub Storage
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => setCurrentDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 1);
            return d.toISOString().split('T')[0];
          })}
          className="p-2 rounded-full hover:bg-gray-100"
          disabled={isLoading}
        >
          <ChevronLeft />
        </button>
        <h2 className="text-xl font-bold">{new Date(currentDate).toLocaleDateString()}</h2>
        <button 
          onClick={() => setCurrentDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
          })}
          className="p-2 rounded-full hover:bg-gray-100"
          disabled={isLoading}
        >
          <ChevronRight />
        </button>
      </div>

      {/* ... (rest of the UI code remains the same) ... */}

      <button
        onClick={handleSave}
        disabled={isLoading || !token}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg flex items-center justify-center disabled:bg-gray-400"
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Save className="w-6 h-6" />
        )}
      </button>
    </div>
  );
};

export default DailyLog;
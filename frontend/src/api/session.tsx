export async function fetchSessions() {
  try {
        const response = await fetch('api/sessions');

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return await response.json();
    } catch (error) {
        console.error('There was a problem with the fetch sessions operation:', error);
    }
}

export async function createSession(name: string) {
  try {
        const response = await fetch('api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return await response.json();
    } catch (error) {
        console.error('There was a problem with the create session operation:', error);
    }
}

export async function deleteSession(sessionId: string) {
  try {
        const response = await fetch(`api/sessions/${sessionId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return await response.json();
    } catch (error) {
        console.error('There was a problem with the delete session operation:', error);
    }
}
import { useState } from 'react'
import type { Movie } from './data/types'
import './App.css'
import { isMovie } from '../serverSrc/data/validation'



function App() {
  const [movies, setMovies] = useState<Movie[] | null>(null)

  const handleGetMovies = async () => {
	try {
		const response: Response = await fetch ('/api/movies')
		const data = await response.json()

		 const validMovies: Movie[] = Array.isArray(data) // kollar om data är en array
            ? data.filter(isMovie)  // Detta filtrerar och ger Movies
            : [];
		
		setMovies(validMovies);
		console.log('Fetched movies:', validMovies);

	} catch (error) {
		console.error('Error fetching movies:', error)
		setMovies(null);
	}

	
  }

  return (
	<>
   <header>
	<h1>Studio Ghibli</h1>
   </header>
   <main>
		<div>
			<button onClick={handleGetMovies}>Hämta filmer</button>
			<ul>
				{movies && movies.map(movie => (
					<li key={movie.movieId}>
						<h2>{movie.title} ({movie.year})</h2>
						<p>Director: {movie.director}</p>
						<img src={movie.img} alt={movie.title} width="200" />
					</li>
				))}
			</ul>
		</div>

   </main>
   </>
  )
}

export default App

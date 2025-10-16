import { useState } from 'react'
import './App.css'
import { isMovie, isReview, type Movie, type Review } from '../serverSrc/data/validation'



function App() {
  const [movies, setMovies] = useState<Movie[] | null>(null)
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);	

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

  const handleGetReviews = async (movieId: string) => {
	try {
		const response: Response = await fetch(`/api/movies/${movieId}/reviews`)
		const data = await response.json()

		 const validReviews: Review[] = Array.isArray(data) // kollar om data är en array
			? data.filter(isReview)  // Detta filtrerar och ger Reviews
			: [];
		setReviews(validReviews);
		setSelectedMovieId(movieId); 
		console.log('Fetched reviews for movie:', movieId, validReviews);

	} catch (error) {
		console.error('Error fetching reviews:', error)
		setReviews(null);
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
						<button className='getReviews-button' onClick={() => handleGetReviews(movie.movieId)}>Visa filmrecensioner</button>
						
						{selectedMovieId === movie.movieId && reviews && reviews.length > 0 && (
							<div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
								<h3>Recensioner:</h3>
								<ul>
									{reviews.map(review => (
										<li key={review.reviewId}>
											<p><strong>{review.name}</strong></p>
											<p>Betyg: {review.rating}/5 ⭐</p>
										</li>
									))}
								</ul>
							</div>
						)}
					</li>
				))}
			</ul>
		</div>

   </main>
   </>
  )
}

export default App

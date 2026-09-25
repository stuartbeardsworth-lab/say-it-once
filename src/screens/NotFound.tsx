import { RouteLink } from '../router';

export function NotFound() {
  return (
    <>
      <h1 tabIndex={-1}>Page not found</h1>
      <p>This address doesn&rsquo;t match anything in Say It Once. Your record has not been changed.</p>
      <p>
        <RouteLink to="home">Go to Home</RouteLink>
      </p>
    </>
  );
}

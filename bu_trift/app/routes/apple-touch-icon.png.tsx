// Resource route to handle Apple touch icon requests
// Returns 204 No Content to prevent route matching errors
export async function loader() {
  return new Response(null, {
    status: 204,
    headers: {
      "Content-Type": "image/png",
    },
  });
}

export default function AppleTouchIcon() {
  return null;
}


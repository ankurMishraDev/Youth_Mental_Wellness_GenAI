import { Link } from "react-router";

export default function Landing() {
  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="flex flex-col justify-center items-center h-full w-full gap-4">
        <h1 className="font-Landing text-xl">Youth-foundary</h1>
        <Link
          to="/login"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}

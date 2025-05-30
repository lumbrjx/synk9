import { SocketComponent } from "@/sock/sock";
export default function Dashboard() {

  return (
    <div>
      <h1 className="text-3xl font-bold">Hello user</h1>
      <div className="text-white">
        <SocketComponent />

        Welcome to autotakt
      </div>

    </div>
  );
}

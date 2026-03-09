import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { NavLink } from "react-router";
import { Analytics } from "@vercel/analytics/react";
import { Button } from "./components/ui/button";
import { db } from "./db/db";

export default function Yo() {
	const [name, setName] = useState("");
	const [brand, setBrand] = useState("");
	const [status, setStatus] = useState("huh");

	async function addBean() {
		try {
			const id = await db.Beans.add({
				name,
				brand,
			});
			setStatus(`Bean added successfully with id ${id}`);
			setName("");
			setBrand("");
		} catch (error) {
			console.error(error);
			setStatus("Failed to add bean");
		}
	}

	async function handleDelete(id: number) {
		try {
			await db.Beans.delete(id);
			setStatus(`Bean deleted successfully with id ${id}`);
		} catch (error) {
			console.error(error);
			setStatus("Failed to delete bean");
		}
	}

	const beans = useLiveQuery(() => db.Beans.toArray(), [], []);

	return (
		<div className="w-full h-full flex">
			<div className="relative">
				<NavLink to="/" className={"absolute top-5 left-5"}>
					<Button className="flex">Home</Button>
				</NavLink>
			</div>
			<div className="w-full h-full flex flex-col">
				<div className="flex justify-center p-6 gap-4">
					<p className="bg-primary-800 text-primary-100 rounded p-2">
						{status}
					</p>
				</div>
				<div className="flex justify-center items-center p-6 gap-4">
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="name"
						className="border-primary-200 border-2 p-2 rounded"
					></input>
					<input
						value={brand}
						onChange={(e) => setBrand(e.target.value)}
						placeholder="brand"
						className="border-primary-200 border-2 p-2 rounded"
					></input>
					<Button onClick={addBean}>submit</Button>
				</div>
				<div className="flex justify-center items-start flex-col p-6 gap-4">
					{beans.map((bean) => (
						<div className="flex flex-row gap-4" key={bean.id}>
							<Button onClick={() => handleDelete(bean.id)}>Delete</Button>
							<p className="bg-primary-200 text-primary-700 rounded p-2">
								{bean.name} - {bean.brand}
							</p>
						</div>
					))}
				</div>
			</div>
			<Analytics />
		</div>
	);
}

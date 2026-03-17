import { getSeasons, getDrivesData } from "./actions";
import DrivesClient from "./DrivesClient";

export default async function DrivesPage() {
  const seasons = await getSeasons();
  
  // By default, fetch drives for the most recent season
  const initialSeasonId = seasons.length > 0 ? seasons[0].id : "";
  const initialDrivesData = initialSeasonId ? await getDrivesData(initialSeasonId) : [];

  return (
    <DrivesClient 
      seasons={seasons} 
      initialSeasonId={initialSeasonId} 
      initialDrivesData={initialDrivesData} 
    />
  );
}

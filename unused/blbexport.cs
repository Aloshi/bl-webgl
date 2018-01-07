function exportUIBLB()
{
	%mapFile = new FileObject();
	%mapFile.openForWrite("config/server/blbmap.txt");
	
	for(%i = 0; %i < DataBlockGroup.getCount(); %i++)
	{
		%db = DataBlockGroup.getObject(%i);

		if(%db.getClassName() $= "fxDTSBrickData")
		{
			%ui = %db.uiName;
			%blb = %db.brickFile;
		
			%blbFilename = %blb; //should include .blb at the end
			%blbExpanded = strreplace(%blbFilename, "/", "\t");
			%blbFilename = getField(%blbExpanded, getFieldCount(%blbExpanded) - 1);
			
			%oldBlb = new FileObject();
			%oldBlb.openForRead(%blb);

			%newBlb = new FileObject();
			%newBlb.openForWrite("config/server/blbs/" @ %blbFilename);

			while(!%oldBlb.isEOF())
			{
				%line = %oldBlb.readLine();
				%newBlb.writeLine(%line);
			}
			%oldBlb.close();
			%newBlb.close();
			%oldBlb.delete();
			%newBlb.delete();
			
			%mapFile.writeLine(%ui @ "\"" @ %blbFilename);
		}
	}
	
	%mapFile.close();
	%mapFile.delete();
}
import { useState, useMemo, useRef, useEffect } from "react";
import {
  VStack,
  Box,
  Heading,
  Flex,
  Text,
  IconButton,
  useBreakpointValue,
} from "@chakra-ui/react";
import Plot from "react-plotly.js";
import { motion, useInView } from "framer-motion";
import Select from "react-select";
import { ChevronLeftIcon, ChevronRightIcon} from "@chakra-ui/icons";
import { saveAs } from "file-saver";


function Chart({ pair, xParam, yParam, data, paramUnits, widthPercent = "100%" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "-100px" });

  // Removed: chartType state and toggleChartType function

  // Prepare data and layout for the Scatter Plot only
  const { plotData, plotLayout } = useMemo(() => {
    
    // --- AXIS TITLES WITH UNITS ---
    const xAxisTitle = `${xParam} (${paramUnits[xParam] || ""})`;
    const yAxisTitleScatter = `${yParam} (${paramUnits[yParam] || ""})`;
    
    // Using a bright color for visibility on a dark background
    const BRIGHT_COLOR = '#6f98b5ff'; // Changed from the hex code to a simple, bright color for maximum visibility

    // SCATTER PLOT LOGIC
    const scatterData = data.map((d) => ({
        ...d,
        type: "scatter",
        mode: "markers",
    }));

    // Layout with explicit white title color and optimized margins for visibility
    const scatterLayout = {
        xaxis: { 
            title: { 
                text: xAxisTitle,
                font: { color: BRIGHT_COLOR }
            }, 
            color: BRIGHT_COLOR // Set tick color to BRIGHT_COLOR
        },
        yaxis: { 
            title: {
                text: yAxisTitleScatter, 
                font: { color: BRIGHT_COLOR }
            }, 
            color: BRIGHT_COLOR // Set tick color to BRIGHT_COLOR
        },
        plot_bgcolor: "black",
        paper_bgcolor: "black",
        font: { color: BRIGHT_COLOR }, // Set general font/tick label color to BRIGHT_COLOR
        showlegend: false,
        // Optimized margins for title visibility (b=bottom, l=left)
        margin: { t: 20, b: 70, l: 80, r: 20 }, 
        autosize: true,
        title: '', // Layout title is blank
    };
      
    return { plotData: scatterData, plotLayout: scatterLayout };

  }, [data, xParam, yParam, paramUnits]); // Removed chartType dependency

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: inView ? 1 : 0 }}
      transition={{ duration: 0.6 }}
      style={{
        width: widthPercent,
        display: "flex",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      <Box
        w="100%"
        maxW="100%"
        bg="black"
        borderRadius="xl"
        p={4}
        display="flex"
        flexDirection="column"
        alignItems="center"
      >
        <Flex justify="center" align="center" w="100%" mb={3} px={2}>
            {/* Centered Heading with no toggle button */}
            <Heading size="md" color="cyan.200" textAlign="center">
                {pair}
            </Heading>
            {/* Removed the IconButton for toggling chart type */}
        </Flex>
        
        <Box w="100%" h="400px" position="relative">
          <Plot
            data={plotData}
            layout={plotLayout}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler={true}
            config={{ responsive: true, displayModeBar: 'hover' }}
          />
        </Box>
      </Box>
    </motion.div>
  );
}
// i made some filtering changes here 

// old code : Visualization({  records }) {
export default function Visualization({  records, relevantProfileIds = [] }) {
  
  const hasRecords = records && records.length > 0;
  const [selectedFloats, setSelectedFloats] = useState([]);
  const [selectedPairs, setSelectedPairs] = useState([
    "Temperature vs Salinity",
    "Depth vs Temperature",
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const paramPairsOptions = [
    "Temperature vs Salinity",
    "Depth vs Temperature",
    "Depth vs Salinity",
    "Depth vs Pressure",
  ];

  const isLandscape = useBreakpointValue({ base: false, md: true });

//i made changes to renaming here
/* old code 
        Float: r.float_id,
        Latitude: r.latitude,
        Longitude: r.longitude,
        Temperature: r.temperature,
        Salinity: r.salinity,
        Pressure: r.pressure,
        Depth: r.depth,
*/

  const df = useMemo(
    () =>
      records.map((r) => ({
        Float: r.profile_id,
        Latitude: r.latitude,
        Longitude: r.longitude,
        Temperature: r.temperature,
        Salinity: r.salinity,
        Pressure: r.pressure,
        Depth: r.depth_index,
      })),
    [records]
  );

  const floatOptions = useMemo(
    () =>
      Array.from(new Set(df.map((r) => r.Float))).map((f) => ({
        value: f,
        label: f,
      })),
    [df]
  );

  
//i made some big code paste changes here for filtering 
/*
old code 
  useEffect(() => {
    setSelectedFloats(floatOptions);
  }, [floatOptions]);


*/

  useEffect(() => {
    // If backend tells us which profile IDs are most relevant, use those as defaults.
    if (Array.isArray(relevantProfileIds) && relevantProfileIds.length > 0) {
      // Keep only options that actually exist in floatOptions
      const filteredDefaults = floatOptions.filter((f) =>
        relevantProfileIds.includes(f.value)
      );

      // If none of the relevant IDs matched available floats, fallback to all floats
      setSelectedFloats(filteredDefaults.length > 0 ? filteredDefaults : floatOptions);
    } else {
      // No backend hint → show all floats by default (same behavior as before)
      setSelectedFloats(floatOptions);
    }
  }, [floatOptions, relevantProfileIds]);


  const dfFiltered = useMemo(() => {
    if (!selectedFloats || selectedFloats.length === 0) return df;
    const selectedValues = selectedFloats.map((f) => f.value);
    return df.filter((r) => selectedValues.includes(r.Float));
  }, [df, selectedFloats]);

  const downloadNetCDF = () => {
  if (!hasRecords) return;
  
  // Build minimal NetCDF-like JSON for demonstration
  const ncData = {
    dimensions: Object.keys(df[0] || {}),
    records: df
  };

  const blob = new Blob([JSON.stringify(ncData, null, 2)], { type: "application/x-netcdf" });
  saveAs(blob, "records.nc");
  };


  const downloadTextFile = () => {
  if (!hasRecords) return;

  const header = df[0] ? Object.keys(df[0]).join("\t") : "";
  const rows = df.map((row) => Object.values(row).join("\t")).join("\n");
  const textContent = header + "\n" + rows;

  const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "records.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
};
  const paramUnits = { Temperature: "°C", Salinity: "PSU", Pressure: "dbar", Depth: "m" };

  const mapRef = useRef(null);
  const mapInView = useInView(mapRef, { margin: "-100px" });

  const chartDataList = useMemo(() => {
    return selectedPairs
      .map((pair) => {
        const [xParam, yParam] = pair.split(" vs ");
        const series = (selectedFloats || []).map((fid) => {
          const floatData = dfFiltered.filter((r) => r.Float === fid.value);
          return {
            x: floatData.map((r) => r[xParam]),
            y: floatData.map((r) => r[yParam]),
            type: "scatter",
            mode: "markers",
            marker: { size: 6 },
            name: fid.label,
          };
        });
        return { pair, xParam, yParam, data: series };
      })
      .filter(Boolean);
  }, [selectedPairs, selectedFloats, dfFiltered]);

  const toggleSidebar = () => {
    if (sidebarOpen) {
      setShowControls(false);
      setTimeout(() => setSidebarOpen(false), 220);
    } else {
      setSidebarOpen(true);
      setTimeout(() => setShowControls(true), 300);
    }
  };

  return (
    <Flex w="100%" minH="100vh">
      {/* Sidebar */}
      <motion.div
        animate={{ width: sidebarOpen ? (isLandscape ? "30%" : "100%") : "60px" }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        style={{
          overflow: "hidden",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          bg={sidebarOpen ? "gray.900" : "transparent"}
          borderRadius="xl"
          h="100%"
          display="flex"
          flexDirection="column"
        >
          <Flex align="center" m={2}>
            <IconButton
              aria-label="Toggle sidebar"
              icon={sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              onClick={toggleSidebar}
              size="md"
              bg={sidebarOpen ? "#0D47A1" : "cyan.700"}
              _hover={{ bg: sidebarOpen ? "#0B3D91" : "cyan.500" }}
              _active={{ transform: "scale(0.95)" }}
              borderRadius="full"
              color="cyan.200"
            />
            {sidebarOpen && (
              <Heading size="xl" ml={3} color="cyan.200">
                Controls
              </Heading>
            )}
          </Flex>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showControls && sidebarOpen ? 1 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            {sidebarOpen && showControls && (
              <Box flex="1" p={4} display="flex" flexDirection="column" overflowY="auto">
                <Text mt={6} mb={4} fontSize="lg" color="cyan.100">
                  Select Float(s):
                </Text>
                <Select
                  isMulti
                  options={floatOptions}
                  value={selectedFloats}
                  onChange={setSelectedFloats}
                  placeholder="Search & select floats..."
                  closeMenuOnSelect={false}
                  styles={{
                    control: (base) => ({ ...base, width: "100%", background: "#1A202C", color: "white" }),
                    menu: (base) => ({ ...base, background: "#1A202C", color: "white" }),
                    multiValue: (base) => ({ ...base, backgroundColor: "#0051a2" }),
                    multiValueLabel: (base) => ({ ...base, color: "white" }),
                    input: (base) => ({ ...base, color: "white" }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isFocused ? "#0077cc" : "#0051a2",
                      color: "white",
                    }),
                  }}
                />

                <Text mt={20} mb={4} fontSize="lg" color="cyan.100">
                  Select Parameter Pairs:
                </Text>
                <Select
                  isMulti
                  options={paramPairsOptions.map((p) => ({ value: p, label: p }))}
                  value={selectedPairs.map((p) => ({ value: p, label: p }))}
                  onChange={(vals) => setSelectedPairs(vals.map((v) => v.value))}
                  placeholder="Select parameter pairs..."
                  closeMenuOnSelect={false}
                  styles={{
                    control: (base) => ({ ...base, width: "100%", background: "#1A202C", color: "white" }),
                    menu: (base) => ({ ...base, background: "#1A202C", color: "white" }),
                    multiValue: (base) => ({ ...base, backgroundColor: "#0051a2" }),
                    multiValueLabel: (base) => ({ ...base, color: "white" }),
                    input: (base) => ({ ...base, color: "white" }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isFocused ? "#0077cc" : "#0051a2",
                      color: "white",
                    }),
                  }}
                />
              </Box>
            )}
          </motion.div>
        </Box>
      </motion.div>

      {/* Main Content */}
      <VStack
        w={isLandscape ? (sidebarOpen ? "70%" : "calc(100% - 60px)") : "100%"}
        spacing={6}
        align="center"
        p={4}
      >
       {/* Map Section */}
   <motion.div
            ref={mapRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: mapInView ? 1 : 0 }}
            transition={{ duration: 1 }}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
          >
            <Box
              w="100%" 
              maxW="1000px" 
              bg="black"
              borderRadius="xl"
              p={4}
              display="flex"
              flexDirection="column"
              alignItems="center"
            >
              <Heading size="lg" mb={3} color="cyan.200" textAlign="center">
               Float Locations
              </Heading>

              <Flex w="100%" h="400px" justify="center" align="center">
                {dfFiltered.length > 0 ? (
                  <Plot
                    data={[
                      {
                        type: "scattergeo",
                        mode: "markers",
                        lat: dfFiltered.map((r) => r.Latitude),
                        lon: dfFiltered.map((r) => r.Longitude),
                        text: dfFiltered.map(
                          (r) =>
                            `Float: ${r.Float}<br>Latitude: ${r.Latitude}<br>Longitude: ${r.Longitude}<br>
                              Temperature: ${r.Temperature}°C<br>Salinity: ${r.Salinity} PSU<br>
                              Pressure: ${r.Pressure} dbar<br>Depth: ${r.Depth} m`
                        ),
                        marker: { color: "#d70e00ff", size: 8 },
                        hoverinfo: "text",
                      },
                    ]}
                    layout={{
                      autosize: true,
                      margin: { t: 0, b: 0, l: 0, r: 0 },
                      geo: {
                        showland: true,
                        landcolor: "rgb(20,30,50)",
                        oceancolor: "rgb(0,20,60)",
                        showcountries: true,
                        bgcolor: "black",
                        projection: { type: "natural earth", scale: 4 },
                        uirevision: "mapState",
                        scope: "world",
                        center: { lat: -5, lon: 70 },
                        },
                      plot_bgcolor: "black",
                      paper_bgcolor: "black",
                      showlegend: false,
                    }}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler={true}
                  config={{
                  responsive: true,
                  displayModeBar: 'hover',
                }}
                />
                ) : (
                  <Text color="red.300">No float locations available.</Text>
                )}
              </Flex>
            </Box>
          </motion.div>

{/* Charts Section */}
{hasRecords ? (
            <Flex
              w="100%"
              flexDirection={sidebarOpen ? "column" : "row"}
              flexWrap="wrap"
              justifyContent="center"
              alignItems="flex-start"
              gap="24px"
              boxSizing="border-box"
              
            >
              {chartDataList.map((c, index) => {
                const isOddLast = !sidebarOpen && chartDataList.length % 2 === 1 && index === chartDataList.length - 1;
                const widthPercent = sidebarOpen ? "100%" : isOddLast ? "60%" : "calc(50% - 12px)";

                return (
                  <Chart
                    key={c.pair}
                    pair={c.pair}
                    xParam={c.xParam}
                    yParam={c.yParam}
                    data={c.data}
                    paramUnits={paramUnits}
                    widthPercent={widthPercent}
                  />
                );
              })}
            </Flex>
        ) : (
            // Display message instead of charts when no records are available
            <Box mt={8} w="100%" maxW="1000px" bg="black" borderRadius="xl" p={8} textAlign="center">
                <Heading size="lg" color="red.400" mb={3}>
                    📊 Chart Data Unavailable
                </Heading>
                <Text fontSize="md" color="cyan.100">
                    No records returned.
                </Text>
            </Box>
        )}
{/* Data Table / Download */}
<Box w="100%" maxW="1000px" bg="black" borderRadius="xl" p={4} mt={8}>
  
  {hasRecords ? (
  <>
  <Heading size="md" mb={4} color="cyan.200" textAlign="center">📋 Data Records</Heading>

      <table style={{ width: "100%", borderCollapse: "collapse", color: "white" }}>
        <thead>
          <tr>
            {Object.keys(df[0] || {}).map((col) => (
              <th key={col} style={{ borderBottom: "1px solid cyan", padding: "8px" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dfFiltered.slice(0, 50).map((row, i) => (
            <tr key={i}>
              {Object.values(row).map((val, j) => (
                <td key={j} style={{ borderBottom: "1px solid #333", padding: "8px" }}>{val}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <Box textAlign="center" mt={4} display="flex" gap={4} justifyContent="center">
  <button
    onClick={downloadTextFile}
    style={{
      background: "#334fa3ff",
      color: "white",
      padding: "8px 16px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontFamily: "Roboto Mono, monospace",
    }}
  >
    Download TXT
  </button>
  
  <a
    href={`data:text/csv;charset=utf-8,${encodeURIComponent(
      [df[0] ? Object.keys(df[0]).join(",") : "", ...df.map((row) => Object.values(row).join(","))].join("\n")
    )}`}
    download="records.csv"
    style={{
      background: "#0d6da1ff",
      color: "white",
      padding: "8px 16px",
      borderRadius: "8px",
      textDecoration: "none",
      fontFamily: "Roboto Mono, monospace",
    }}
  >
    Download CSV
  </a>

  <button
    onClick={downloadNetCDF}
    style={{
      background: "#00aaa4ff",
      color: "white",
      padding: "8px 16px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontFamily: "Roboto Mono, monospace",
    }}
  >
    Download netCDF
  </button>
</Box>
    </>
          ) : (
            
            // Display "No records returned" message when hasRecords is false
            <Box textAlign="center" py={4}>
              <Heading size="lg" color="red.400" mb={3}>
            📋 Data Records Unavailable
          </Heading>
              <Text fontSize="l" color="cyan.300" fontWeight="normal">
              No records returned
              </Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Flex>
  );
}

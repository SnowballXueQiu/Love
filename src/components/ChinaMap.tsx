"use client";
import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { supabase } from "@/lib/supabase";
import MapEditModal from "./MapEditModal";

interface VisitedPlace {
    id: number;
    name: string;
}

interface ChinaMapProps {
    currentUser: "name1" | "name2" | null;
}

const NAME_MAPPING: Record<string, string> = {
    '北京': '北京市', '天津': '天津市', '上海': '上海市', '重庆': '重庆市',
    '河北': '河北省', '山西': '山西省', '辽宁': '辽宁省', '吉林': '吉林省', '黑龙江': '黑龙江省',
    '江苏': '江苏省', '浙江': '浙江省', '安徽': '安徽省', '福建': '福建省', '江西': '江西省',
    '山东': '山东省', '河南': '河南省', '湖北': '湖北省', '湖南': '湖南省', '广东': '广东省',
    '海南': '海南省', '四川': '四川省', '贵州': '贵州省', '云南': '云南省', '陕西': '陕西省',
    '甘肃': '甘肃省', '青海': '青海省', '台湾': '台湾省',
    '内蒙古': '内蒙古自治区', '广西': '广西壮族自治区', '西藏': '西藏自治区',
    '宁夏': '宁夏回族自治区', '新疆': '新疆维吾尔自治区',
    '香港': '香港特别行政区', '澳门': '澳门特别行政区'
};

export default function ChinaMap({ currentUser }: ChinaMapProps) {
    const [visitedPlaces, setVisitedPlaces] = useState<string[]>([]);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchVisited = async () => {
        supabase.from('visited_places').select('name')
        .then(({data}) => {
            if (!data) {
                return;
            }
            setVisitedPlaces(data.map(p => p.name));
        })
    };

    useEffect(() => {
        fetch('/china-map.json')
            .then(resp => resp.json())
            .then(map => echarts.registerMap('china', map))
            .then(() => setIsMapLoaded(true))
            .catch(reason => console.error("Failed to load map data:", reason))
        fetchVisited();

        // Realtime subscription
        const channel = supabase
            .channel('visited_places')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'visited_places' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setVisitedPlaces(prev => [...prev, payload.new.name]);
                } else if (payload.eventType === 'DELETE') {
                    // We need to refetch or handle delete if we had IDs. 
                    // Since we only store names in state for now, refetching is safest or we need to track IDs.
                    fetchVisited();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getOption = () => {
        // Map short names to full names for ECharts
        const fullNames = visitedPlaces.map(name => NAME_MAPPING[name] || name);
        const data = fullNames.map(name => ({ name, value: 1 }));

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    // Reverse mapping to show short name in tooltip if possible
                    const fullName = params.name;
                    const shortName = Object.keys(NAME_MAPPING).find(key => NAME_MAPPING[key] === fullName) || fullName;
                    return shortName;
                },
                backgroundColor: '#ffffff',
                borderColor: '#232323',
                borderWidth: 2,
                textStyle: {
                    color: '#232323',
                    fontFamily: 'var(--font-ark-pixel)'
                }
            },
            geo: {
                map: 'china',
                roam: true, // Allow zooming/panning
                zoom: 1.2,
                label: {
                    show: false,
                    color: '#232323',
                    fontSize: 10,
                    fontFamily: 'var(--font-ark-pixel)'
                },
                itemStyle: {
                    areaColor: '#ffffff', // Default color (unvisited)
                    borderColor: '#232323',
                    borderWidth: 1.5,
                    shadowColor: 'rgba(35, 35, 35, 0.5)',
                    shadowBlur: 0,
                    shadowOffsetX: 2,
                    shadowOffsetY: 2
                },
                emphasis: {
                    itemStyle: {
                        areaColor: '#ffc900', // Hover color
                        borderColor: '#232323',
                        borderWidth: 2,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0
                    },
                    label: {
                        show: true,
                        color: '#232323',
                        formatter: (params: any) => {
                            const fullName = params.name;
                            return Object.keys(NAME_MAPPING).find(key => NAME_MAPPING[key] === fullName) || fullName;
                        }
                    }
                },
                regions: fullNames.map(name => ({
                    name: name,
                    itemStyle: {
                        areaColor: '#ff90e8', // Visited color (Memphis Pink)
                        borderColor: '#232323',
                        borderWidth: 1.5
                    }
                }))
            },
            series: [
                {
                    name: 'Visited',
                    type: 'map',
                    geoIndex: 0,
                    data: data,
                    selectedMode: false,
                    select: {
                        disabled: true
                    }
                }
            ]
        };
    };

    return (
        <section className="memphis-card bg-memphis-cyan flex flex-col w-full h-[500px] relative overflow-hidden">
            <div className="flex justify-between items-center border-b-3 border-memphis-black pb-2 mb-4">
                <h2 className="text-xl font-bold text-white text-shadow-sm">
                    我们的足迹 🗺️
                </h2>
                {currentUser && (
                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="memphis-btn bg-memphis-yellow text-sm py-1 px-3"
                    >
                        编辑
                    </button>
                )}
            </div>
            
            <div className="flex-1 w-full h-full bg-white border-3 border-memphis-black shadow-[4px_4px_0_#232323] relative">
                {isMapLoaded ? (
                    <ReactECharts 
                        option={getOption()} 
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'svg' }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="font-bold animate-pulse">加载地图中...</p>
                    </div>
                )}
                
                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white/90 border-2 border-memphis-black p-2 text-xs font-bold shadow-[2px_2px_0_#232323]">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 bg-memphis-pink border border-memphis-black"></div>
                        <span>去过的地方</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border border-memphis-black"></div>
                        <span>未探索</span>
                    </div>
                </div>

                {/* Progress */}
                <div className="absolute top-4 right-4 bg-white/90 border-2 border-memphis-black p-2 text-sm font-bold shadow-[2px_2px_0_#232323]">
                    <span>解锁进度: {visitedPlaces.length} / 34</span>
                </div>
            </div>

            <MapEditModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                visitedPlaces={visitedPlaces}
            />
        </section>
    );
}

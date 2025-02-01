import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import React, { useState } from 'react';
import * as streamingAvailability from 'streaming-availability';
import { countryFlags, countryNames } from './countryData';

const RAPID_API_KEY = process.env.VITE_API_KEY; // Laden Sie den API-Schlüssel aus der .env Datei

const client = new streamingAvailability.Client(
  new streamingAvailability.Configuration({
    apiKey: RAPID_API_KEY,
  })
);

interface Genre {
  id: string;
  name: string;
}

interface ImageSet {
  verticalPoster: {
    w240: string;
    w360: string;
    w480: string;
    w600: string;
    w720: string;
  };
}

interface Service {
  id: string;
  name: string;
  homePage: string;
  themeColorCode: string;
  imageSet: {
    lightThemeImage: string;
    darkThemeImage: string;
    whiteImage: string;
  };
}

interface StreamingOption {
  service: Service;
  type: string;
  link: string;
  quality?: string; // Make quality optional
  audios: { language: string }[];
  subtitles: { locale: { language: string } }[];
  price?: {
    amount: string;
    currency: string;
    formatted: string;
  };
  addon?: {
    id: string;
    name: string;
    homePage: string;
    themeColorCode: string;
    imageSet: {
      lightThemeImage: string;
      darkThemeImage: string;
      whiteImage: string;
    };
  };
}

interface Show {
  id: string | undefined;
  title: string | undefined;
  overview: string | undefined;
  firstAirYear: number | undefined;
  lastAirYear: number | undefined;
  genres: Genre[] | undefined;
  cast: string[] | undefined;
  rating: number | undefined;
  seasonCount: number | undefined;
  episodeCount: number | undefined;
  imageSet: ImageSet;
  streamingOptions: Record<string, StreamingOption[]>;
  type: string;
}

export function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<Show[]>([]);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await client.showsApi.searchShowsByTitle({
      title: searchQuery,
      country: 'us',
    });

    const topResults = response.slice(0, 5);

    const detailedResults: Show[] = await Promise.all(
      topResults.map(async (item: streamingAvailability.Show) => {
        const showDetails = await client.showsApi.getShow({ id: item.id });
        return {
          id: showDetails.id,
          title: showDetails.title,
          overview: showDetails.overview,
          firstAirYear: showDetails.firstAirYear || 0,
          lastAirYear: showDetails.lastAirYear || 0,
          genres: showDetails.genres,
          cast: showDetails.cast,
          rating: showDetails.rating,
          seasonCount: showDetails.seasonCount,
          episodeCount: showDetails.episodeCount,
          imageSet: showDetails.imageSet,
          streamingOptions: showDetails.streamingOptions,
          type: showDetails.showType,
        };
      })
    );

    setResults(
      detailedResults.filter(
        (show) => Object.keys(show.streamingOptions).length > 0
      )
    );
    setShowResults(true);
    setExpandedCountry(null);
    setExpandedService(null);
  };

  const toggleCountry = (country: string, showId: string) => {
    const key = `${showId}-${country}`;
    setExpandedCountry(expandedCountry === key ? null : key);
    setExpandedService(null);
  };

  const toggleService = (service: string) => {
    setExpandedService(expandedService === service ? null : service);
  };

  const uniqueServiceKey = (option: StreamingOption) => {
    return option.addon
      ? `${option.service.name}-${option.addon.name}`
      : option.service.name;
  };

  return (
    <main className='min-h-screen w-full bg-gray-900'>
      <div className='mx-auto p-6'>
        <h1 className='text-3xl font-bold text-center mb-8 text-gray-100'>
          Global Streaming Availability Search
        </h1>
        <form onSubmit={handleSearch} className='mb-8 flex'>
          <div className='relative flex-grow'>
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search for a show or movie...'
              className='w-full px-4 py-3 pl-12 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-gray-400'
            />
            <Search
              className='absolute left-4 top-3.5 text-gray-400'
              size={20}
            />
          </div>
          <button
            type='submit'
            className='ml-4 px-4 py-3 rounded-lg bg-blue-600 text-gray-100 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          >
            Search
          </button>
        </form>
        {showResults && (
          <div className='grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
            {results.map((result, resultIndex) => (
              <div
                key={resultIndex}
                className='bg-gray-800 rounded-lg shadow-xl p-6 '
              >
                <div className='border-b border-gray-700 pb-4 mb-6'>
                  <div className='flex items-start mb-4'>
                    <img
                      src={result.imageSet.verticalPoster.w240}
                      alt={result.title}
                      className='w-24 h-auto rounded-lg mr-4'
                    />
                    <div>
                      <h2 className='text-2xl font-semibold text-gray-100'>
                        {result.title}
                      </h2>
                      <span className='bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm'>
                        {result.type}
                      </span>
                    </div>
                  </div>
                  <p className='text-gray-400'>{result.overview}</p>
                </div>
                {Object.keys(result.streamingOptions).length === 0 ? (
                  <p className='text-gray-400'>Nowhere available</p>
                ) : (
                  <div className='divide-y divide-gray-700'>
                    {Object.entries(result.streamingOptions)
                      .sort(([a], [b]) =>
                        countryNames[a].localeCompare(countryNames[b])
                      )
                      .map(([country, options]) => {
                        const uniqueServices = new Set<string>();
                        const filteredOptions = options.filter(
                          (option) =>
                            !uniqueServices.has(uniqueServiceKey(option)) &&
                            option.type !== 'buy' &&
                            option.audios.length > 0
                        );
                        if (filteredOptions.length === 0) {
                          return null;
                        }
                        filteredOptions.forEach((option) => {
                          uniqueServices.add(uniqueServiceKey(option));
                        });
                        const countryKey = `${result.id}-${country}`;
                        return (
                          <div key={countryKey} className='overflow-hidden'>
                            <button
                              onClick={() => toggleCountry(country, result.id!)}
                              className='w-full px-4 py-3 flex justify-between items-center hover:bg-gray-700/50 transition-colors'
                            >
                              <span className='font-medium text-gray-100'>
                                <img
                                  src={countryFlags[country]}
                                  alt={countryNames[country]}
                                  className='inline-block w-6 h-6 mr-2'
                                />
                                {countryNames[country] || country.toUpperCase()}
                              </span>
                              {expandedCountry === countryKey ? (
                                <ChevronUp
                                  className='text-gray-400'
                                  size={20}
                                />
                              ) : (
                                <ChevronDown
                                  className='text-gray-400'
                                  size={20}
                                />
                              )}
                            </button>
                            {expandedCountry === countryKey && (
                              <div className='px-4 mt-1 pb-4 space-y-3'>
                                {filteredOptions
                                  .sort((a, b) => {
                                    const nameA = a.addon
                                      ? a.addon.name
                                      : a.service.name;
                                    const nameB = b.addon
                                      ? b.addon.name
                                      : b.service.name;
                                    return nameA.localeCompare(nameB);
                                  })
                                  .filter(
                                    (option, index, self) =>
                                      index ===
                                      self.findIndex(
                                        (o) =>
                                          uniqueServiceKey(o) ===
                                          uniqueServiceKey(option)
                                      )
                                  )
                                  .map((option) => {
                                    const serviceKey = uniqueServiceKey(option);
                                    return (
                                      <div
                                        key={serviceKey}
                                        className='bg-gray-700/30 rounded-lg overflow-hidden'
                                      >
                                        <button
                                          onClick={() =>
                                            toggleService(serviceKey)
                                          }
                                          className='w-full px-4 py-3 flex justify-between items-center hover:bg-gray-700/50 transition-colors'
                                        >
                                          <div className='flex items-center gap-4'>
                                            <span className='font-medium text-gray-100'>
                                              {option.addon
                                                ? option.addon.name
                                                : option.service.name}
                                            </span>
                                            {expandedService === serviceKey ? (
                                              <ChevronUp
                                                className='text-gray-400'
                                                size={20}
                                              />
                                            ) : (
                                              <ChevronDown
                                                className='text-gray-400'
                                                size={20}
                                              />
                                            )}
                                          </div>
                                        </button>
                                        {expandedService === serviceKey && (
                                          <div className='px-4 pb-3 pt-1'>
                                            <div className='grid gap-3'>
                                              <div>
                                                <h5 className='text-sm font-medium text-gray-400 mb-1'>
                                                  available audio:
                                                </h5>
                                                <div className='flex flex-wrap gap-2'>
                                                  {option.audios.map(
                                                    (audio) => (
                                                      <span
                                                        key={audio.language}
                                                        className='bg-gray-600 text-gray-200 px-2 py-1 rounded text-sm'
                                                      >
                                                        {audio.language}
                                                      </span>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                              <div>
                                                <h5 className='text-sm font-medium text-gray-400 mb-1'>
                                                  available subtitles:
                                                </h5>
                                                <div className='flex flex-wrap gap-2'>
                                                  {option.subtitles.map(
                                                    (sub) => (
                                                      <span
                                                        key={
                                                          sub.locale.language
                                                        }
                                                        className='bg-gray-600 text-gray-200 px-2 py-1 rounded text-sm'
                                                      >
                                                        {sub.locale.language}
                                                      </span>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

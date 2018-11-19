import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	Button,
	TouchableOpacity,
	Platform,
	TextInput,
	ActivityIndicator,
	FlatList,
	Image
} from 'react-native';
import { Camera, Permissions, FileSystem, Location, MediaLibrary } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import Fire from '../Fire';
import t from 'tcomb-form-native';

const Form = t.form.Form;

const camSettings = t.struct({
	interval: t.Number,
	duration: t.Number
});

const statusTypes = t.enums({
	normal: 'Normal',
	caution: 'Caution',
	danger: 'Danger'
});

const pin = t.struct({
	title: t.String,
	latitude: t.Number,
	longitude: t.Number,
	status: statusTypes,
	comments: t.String
});

export default class LinksScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			noPermMessage: 'ViweShare needs access to your camera to work.',
			hasCameraPermission: null,
			hasCameraRollPermission: null,
			type: Camera.Constants.Type.back,
			openCamera: false,
			pictures: [],
			takingPhotos: false,
			takenPhotoCount: 0,
			interval: 0,
			duration: 0,
			selectScreen: false,
			pinScreen: false,
			renderUploading: false,
			location: {}
		};
	}

	async getLocation() {
		let { status } = await Permissions.askAsync(Permissions.LOCATION);
		if (status !== 'granted') return;
		let location = await Location.getCurrentPositionAsync({});
		this.setState({ location });
	}

	async componentWillMount() {
		const { status } = await Permissions.askAsync(Permissions.CAMERA);
		const { status2 } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
		this.setState({
			hasCameraPermission: status === 'granted',
			hasCameraRollPermission: status === 'granted'
		});
	}

	componentDidMount() {
		FileSystem.makeDirectoryAsync(
			FileSystem.documentDirectory + 'photos'
		).catch(e => {
			return null;
		});
	}

	static navigationOptions = {
		title: 'Links'
	};

	openCamera() {
		if (this.state.openCamera) {
			return 'Camera Opened';
		} else {
			return 'Camera Not Opened';
		}
	}

	takeManyPictures = async () => {
		this.setState({ takingPhotos: true });
		for (let i = 1; i <= this.state.duration / this.state.interval; i++) {
			if (!this.camera) return;
			await this.takePicture();
		}
		this.setState({ takingPhotos: false });
	};

	async takePicture() {
		const { uri } = await this.camera.takePictureAsync();
		let oldPictures = this.state.pictures;
		this.setState({ pictures: [...oldPictures, uri] });
		this.setState({ takenPhotoCount: ++this.state.takenPhotoCount });
		setTimeout(() => {
			null;
		}, this.state.interval * 1000);
	}

	async takePictureOriginal() {
		if (this.camera) {
			// this.camera.takePictureAsync({ onPictureSaved: this.onPictureSaved });
			this.setState({ takenPhotoCount: ++this.state.takenPhotoCount });
			const { uri } = await this.camera.takePictureAsync();
			await Fire.shared.post(uri);
			const asset = await MediaLibrary.createAssetAsync(uri);
			setTimeout(() => {
				null;
			}, this.state.interval * 1000);
		}
	}

	onPictureSaved = async photo => {
		console.log(
			`Moved to: ${FileSystem.documentDirectory}photos/${Date.now()}.jpg`
		);
		await FileSystem.moveAsync({
			from: photo.uri,
			to: `${FileSystem.documentDirectory}photos/${Date.now()}.jpg`
		});
		this.setState({ newPhotos: true });
	};

	moveToPin = async () => {
		this.setState({ renderUploading: true });
		await this.getLocation();
		this.setState({
			selectScreen: false,
			pinScreen: true,
			renderUploading: false
		});
	};

	renderNext = function() {
		if (!this.state.takingPhotos && this.state.pictures.length > 0)
			return (
				<View style={{ alignSelf: 'flex-end' }}>
					<TouchableOpacity
						onPress={() => {
							this.setState({ selectScreen: true, camera: null });
						}}
					>
						<Text style={{ fontSize: 14, borderWidth: 1, padding: 2 }}>
							Next
						</Text>
					</TouchableOpacity>
				</View>
			);
	};

	renderUploading = () => {
		if (this.state.renderUploading) {
			// return (
			// 	<View>
			// 		<Text>Please wait...</Text>
			// 	</View>
			// );
			return <ActivityIndicator size="large" color="#0000ff" />;
		}

		if (this.state.pinScreen) {
			return (
				<Button
					onPress={() => {
						this.handlePinSubmit();
					}}
					title="Submit"
				/>
			);
		}

		if (this.state.selectScreen) {
			return <Button onPress={this.moveToPin} title="Done" />;
		}
	};

	buttonStyle = () => {
		if (!this.state.takingPhotos) {
			return {
				borderWidth: 1,
				borderColor: 'rgba(0,0,0,0.2)',
				alignItems: 'center',
				justifyContent: 'center',
				width: 55,
				height: 55,
				backgroundColor: '#fff',
				borderRadius: 100
			};
		} else
			return {
				borderWidth: 1,
				borderColor: 'rgba(0,255,0,0.2)',
				alignItems: 'center',
				justifyContent: 'center',
				width: 55,
				height: 55,
				backgroundColor: '#98FB98',
				borderRadius: 100
			};
	};

	// Submit camera options
	handleSubmit = () => {
		const value = this._form.getValue();
		this.setState({ interval: value.interval, duration: value.duration });
	};

	postPictures = async () => {
		let res = [];
		for (picture of this.state.pictures) {
			const remoteUri = await Fire.shared.post(picture);
			res.push(remoteUri);
		}
		return res;
	};

	// Submit Pin creation options
	handlePinSubmit = async () => {
		this.setState({ renderUploading: true });
		let value = this._pinForm.getValue();

		const pictureUris = await this.postPictures();

		const ref = await Fire.shared.createPin(
			value.title,
			value.latitude,
			value.longitude,
			value.status,
			value.comments,
			pictureUris
		);
		this.setState({ renderUploading: false });
		this.props.navigation.navigate('Home');
	};

	static navigationOptions = {
		header: null
	};

	render() {
		if (!this.state.hasCameraPermission) {
			return (
				<View>
					<Text>{this.state.noPermMessage}</Text>
				</View>
			);
		}

		// Make Pin Screen
		if (this.state.pinScreen) {
			return (
				<View style={styles.container}>
					<Form
						ref={c => (this._pinForm = c)}
						type={pin}
						value={{
							latitude: this.state.location.coords.latitude,
							longitude: this.state.location.coords.longitude
						}}
					/>
					{this.renderUploading()}
				</View>
			);
		}

		// Select Screen
		if (this.state.selectScreen) {
			return (
				<View>
					<Text style={{ textAlign: 'center', marginTop: 20, fontSize: 20 }}>
						Choose photos to upload
					</Text>
					{this.renderUploading()}
					<FlatList
						data={this.state.pictures}
						numColumns={3}
						keyExtractor={(item, index) => item}
						renderItem={({ item }) => (
							<Image
								style={{ height: 115, width: 120 }}
								source={{ uri: item }}
							/>
						)}
					/>
				</View>
			);
		}

		// Camera State
		if (this.state.openCamera) {
			return (
				<View style={{ flex: 1 }}>
					<Camera
						style={{ flex: 1 }}
						type={this.state.type}
						ref={ref => {
							this.camera = ref;
						}}
					>
						<View
							style={{
								flex: 1,
								backgroundColor: 'transparent',
								flexDirection: 'column'
							}}
						>
							<View
								stlye={{
									flex: 0.4,
									alignSelf: 'flex-start'
								}}
							>
								<TouchableOpacity
									onPress={() => this.setState({ openCamera: null })}
								>
									<Text style={styles.photoTakenText}>Back</Text>
								</TouchableOpacity>
							</View>
						</View>
					</Camera>
					<View style={styles.tabBarInfoContainer}>
						<View style={{ marginBottom: 5, flex: 1, flexDirection: 'row' }}>
							<Text style={{ textAlign: 'center' }}>
								Photos Taken:
								{this.state.takenPhotoCount}/
								{this.state.duration / this.state.interval}
							</Text>
						</View>
						<View>
							<TouchableOpacity
								style={this.buttonStyle()}
								onPress={() => this.takeManyPictures()}
							>
								<Ionicons size={15} />
							</TouchableOpacity>
						</View>
						{this.renderNext()}
					</View>
				</View>
			);
		}

		// Form state
		return (
			<View style={styles.container}>
				<Form
					ref={c => (this._form = c)}
					type={camSettings}
					value={{ interval: 10, duration: 300 }}
				/>
				<View style={styles.container}>
					<Button
						onPress={() => {
							this.handleSubmit();
							this.setState({ openCamera: true });
						}}
						title="Open Camera"
					/>
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 75,
		paddingBottom: 15,
		paddingHorizontal: 10,
		backgroundColor: '#fff'
	},

	centeredText: {
		fontSize: 14,
		color: '#000',
		textAlign: 'center'
	},

	photoTakenText: {
		color: '#ADD8E6',
		fontSize: 24
	},
	tabBarInfoContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		...Platform.select({
			ios: {
				shadowColor: 'black',
				shadowOffset: { height: -3 },
				shadowOpacity: 0.1,
				shadowRadius: 3
			},
			android: {
				elevation: 20
			}
		}),
		alignItems: 'center',
		backgroundColor: '#fbfbfb',
		paddingVertical: 20,
		paddingHorizontal: 20
	},
	tabBarInfoText: {
		fontSize: 17,
		color: 'rgba(96,100,109, 1)',
		textAlign: 'center'
	}
});
